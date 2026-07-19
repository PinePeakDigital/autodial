import React from "react";
import "./App.css";

import {
  Alert,
  Container,
} from "@mui/material";
import Acknowledgements from "./component/organism/acknowledgements";
import Issues from "./component/organism/issues";
import StepThree from "./component/organism/stepThree";
import StepTwo from "./component/organism/stepTwo";
import StepOne from "./component/organism/stepOne";

function App(): JSX.Element {
  return <Container className={"App"}>
    <h1>Beeminder Autodialer</h1>

    <Alert severity="warning">
      This tool is in beta and may contain bugs. Use at your own risk. If you
      encounter any bugs that are not documented
      in the known limitations section below, please report the issue to{" "}
      <a href="mailto:nathan@taskratchet.com">nathan@taskratchet.com</a>. Thank
      you!
    </Alert>

    <p>
      The Beeminder autodialer will automatically adjust the rate on your goals
      based on your historical
      performance.
    </p>

    <h2>Instructions</h2>

    <StepOne />
    <StepTwo />
    <StepThree />

    <Issues />
    <Acknowledgements />
  </Container>;
}

export default App;
