import React from "react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import classes from "../account.module.css";
import axios from "axios";
import { Auth } from "aws-amplify";
import CloseButton from 'react-bootstrap/CloseButton';
import {MDBContainer, MDBRow, MDBCard,} from "mdb-react-ui-kit";

export default function TestHistory() {
  const loc = useLocation();
  const pk = loc.state.PK.split("#");
  const sk = loc.state.SK.split("#");
  const [patient, setPatient] = useState();
  const [tests, setTests] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [testImage, setTestImage] = useState("");
  const [display, setDisplay] = useState({ display: "none" });

  let navigate = useNavigate();
  useEffect(() => {
    getSession();
  }, []);

  async function getSession() {
    try {
      const session = await Auth.currentSession();
    } catch {
      let path = "/accessDenied";
      navigate(path);
    }
    const session = await Auth.currentSession();
    const patientResponse = await axios.get(`/${pk[0]}/${pk[1]}/${sk[0]}/${sk[1]}`, { params: {
      idToken: session.accessToken.jwtToken
    }});
    setPatient(patientResponse.data.Item);
    setTests(patientResponse.data.Item.tests);
    setLoaded(true);
  }

  async function showTest(testId) {
    const session = await Auth.currentSession();
    // let fileName = sk[1] + '-' + testId
    let fileName = "01GWQGK1ABR87S90Y9G255ASAQ-01GWSC1A47D23C5VVZD5ZMJVXS";
    let testImage = await axios.get(`/getTestResults/${fileName}`, { params: {
      idToken: session.accessToken.jwtToken
    }});
    setTestImage(testImage.data);
    setDisplay({ display: "block" });
  }

  function closeImage() {
    setDisplay({ display: "none" });
  }

  return (
    <section>
      {loaded && (
        <div>
        <MDBContainer className=" p-5">
          <MDBRow>
            <MDBCard>
              <div className="search-bar-div">
                <h3>{patient.firstName} {patient.lastName}</h3>
              </div>
            </MDBCard>
          <div className={classes.testImg} style={display}>
            <CloseButton onClick={closeImage} />
          <img src={testImage} alt="testImage" />
          </div>
          <div className={classes.scrollTableTests}>
          <table className={classes.tableWrapperTests}>
            <thead>
              <tr>
                <th>Date Sent</th>
                <th>Status</th>
                <th>Score</th>
                <th>Test</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => {
                return (
                  <tr key={test.dateSent}>
                    <td>{test.dateSent}</td>
                    <td>{test.status}</td>
                    <td>{test.result}</td>
                    <td>
                      <button className="text-buttons" onClick={() => showTest(test.testId)}>View Test</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </MDBRow>
        </MDBContainer>
        </div>
      )}
    </section>
  );
}
