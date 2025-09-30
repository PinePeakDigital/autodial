import React from "react";

export default function Acknowledgements(): JSX.Element {
  return (
    <>
      <h2>Acknowledgements</h2>
      <p>Special thanks to:</p>
      <ul>
        <li>
          <a href="https://www.beeminder.com/aboutus">
            Mary Renaud, Dept. of Treasury at Beeminder
          </a>
          , for creating the original autodialer and sharing her invaluable
          advice during the development of this tool.
        </li>
        <li>
          <a href="https://www.beeminder.com/aboutus">
            Daniel Reeves, co-founder & CEO of Beeminder
          </a>
          , for assisting with the specification and development of the tool.
        </li>
        <li>
          <a href="https://www.beeminder.com/home">The Beeminder company</a> for
          permitting code from their codebase to be copied into this project.
        </li>
        <li>
          <a href="https://icons8.com/">Icons8</a> for providing the favicon.
        </li>
      </ul>
      <p>
        <a href="https://github.com/TaskRatchet/clients/tree/main/apps/autodial">
          This open-source tool
        </a>{" "}
        is maintained by <a href="https://nathanarthur.com">Nathan Arthur</a>{" "}
        and <a href="https://pinepeakdigital.com/">Pine Peak Digital</a>. See
        also:
      </p>
      <ul>
        <li>
          <a href="https://taskratchet.com">TaskRatchet</a>
        </li>
        <li>
          <a href="https://bm.taskratchet.com">Custom Beeminder Dashboard</a>
        </li>
      </ul>
    </>
  );
}
