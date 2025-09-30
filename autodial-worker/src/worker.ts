import { Env } from './types';
import { getGoal, getGoals, updateGoal, dial, getSettings, now, SID } from './lib';

export interface Env {
  DB: D1Database;
}

async function getUsers(db: D1Database) {
  const users = await db.prepare(
    "SELECT id, token, created_at FROM users"
  ).all();
  return users.results.map(user => ({
    beeminder_user: user.id,
    beeminder_token: user.token
  }));
}

async function handleCron(env: Env) {
  const users = await getUsers(env.DB);

  await Promise.all(users.map(async ({beeminder_user, beeminder_token}) => {
    if (!beeminder_user || !beeminder_token) {
      console.log("missing user auth");
      return;
    }

    try {
      const all = await getGoals(beeminder_user, beeminder_token);
      const toDial = all.filter((g) => getSettings(g).autodial);

      await Promise.all(toDial.map(async (g) => {
        console.log(`start dial goal ${beeminder_user}/${g.slug}`);
        try {
          const settings = getSettings(g);
          const diffSince = now() - (SID * 31);
          const fullGoal = await getGoal(
            beeminder_user,
            beeminder_token,
            g.slug,
            diffSince,
          );
          settings.fromGoal = settings.from && await getGoal(
            beeminder_user, beeminder_token, settings.from, diffSince
          ) || undefined;
          const roadall = dial(fullGoal, settings);
          const newRate = roadall && roadall[roadall.length - 1][2];
          const id = `${beeminder_user}/${g.slug}`;

          console.log(`end dial goal ${id}: ${newRate}`);

          if (!roadall) return;

          await updateGoal(
            beeminder_user,
            beeminder_token,
            g.slug,
            {roadall}
          );
        } catch (e) {
          console.error({m: "failed to dial goal", g, e});
        }
      }));
    } catch (e) {
      console.error({m: "failed to handle user", beeminder_user, e});
    }
  }));
}

async function handleUpdate(request: Request, env: Env) {
  const { user, token } = await request.json();
  
  // Verify credentials before storing
  await getUser(user, token);
  
  await env.DB.prepare(
    "INSERT OR REPLACE INTO users (id, token, created_at) VALUES (?, ?, ?)"
  ).bind(user, token, Date.now()).run();

  return new Response("Success", { status: 200 });
}

async function handleRemove(request: Request, env: Env) {
  const { user, token } = await request.json();
  
  // Verify credentials
  await getUser(user, token);
  
  await env.DB.prepare(
    "DELETE FROM users WHERE id = ? AND token = ?"
  ).bind(user, token).run();

  return new Response("Success", { status: 200 });
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleCron(env));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);
    
    try {
      switch (url.pathname) {
        case "/update":
          return await handleUpdate(request, env);
        case "/remove":
          return await handleRemove(request, env);
        default:
          return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      console.error(error);
      return new Response("Error", { status: 500 });
    }
  },
};