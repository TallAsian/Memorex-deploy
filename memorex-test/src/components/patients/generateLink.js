import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import classes from "./generateLink.module.css";
import { ulid } from "ulid";

export default function PhysicianAccount() {
  const [account, setAccount] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState();
  const [testType, setTestType] = useState();
  const [disabled, setDisabled] = useState();
  const [subject, setSubject] = useState("Your test from Dr. ");
  const [previewMessage, setPreviewMessage] = useState("Follow this link to take your test: {test link}");
  const baseUrl = "https://localhost:8000";
  const testId = ulid();

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
    const paymentMethodInvalid = await axios.get(
      `/subscription/${session.idToken.payload.email}`, { params: {
        idToken: session.accessToken.jwtToken
      }});
    setDisabled(paymentMethodInvalid.data);
    const accountResponse = await axios.get(`/user/${session.idToken.payload.email}`, { params: {
      idToken: session.accessToken.jwtToken
    }});
    const patientResponse = await axios.get(`/patients/${session.idToken.payload.email}`, { params: {
      idToken: session.accessToken.jwtToken
    }});
    setAccount(accountResponse.data.Items[0]);
    setPatients(patientResponse.data.Items);
    setPatientId(patientResponse.data.Items[0].SK);
    setSubject(subject + accountResponse.data.Items[0].lastName);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    let message = await getMessage();
    if (!disabled) {
      if (testType === "email") {
        axios({
        method: "post",
        url: "/sendPatientLinkEmail",
        data: JSON.stringify({
          PK: account.SK,
          SK: patientId,
          physicianName: account.lastName,
          subject,
          message: message,
          testId

        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      } else if (testType === "phoneNumber") {
        axios({
          method: "post",
          url: "/sendPatientLinkText",
          data: JSON.stringify({
            PK: account.SK,
            SK: patientId,
            physicianName: account.lastName,
            subject,
            message: message,
            testId
  
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });
      }
      
    }
  }

  function getMessage() {
    let placeHolder = '{test link}';
    let linkIndex = previewMessage.indexOf(placeHolder);
    let url = baseUrl + "/adminPlatform" + "/testId/" + patientId + "-" + testId;
    let endLinkIndex = linkIndex + placeHolder.length;
    let newMessage = previewMessage.substring(0, linkIndex) + url + previewMessage.substring(endLinkIndex);
    return newMessage;
  }

  async function onChange(e) {
    if (e.target.name === "patientId") {
      setPatientId(e.target.value);
    } else if (e.target.name === "testType") {
      setTestType(e.target.value);
    } else if (e.target.name === "subject") {
      setSubject(e.target.value);
    } else if (e.target.name === "message") {
      setPreviewMessage(e.target.value);
    }
  }

  return (
    <div>
      <form>
        <div className={classes.generateLinkForm}>
          <div>
        <div className={classes.linkSelect}>
          <label htmlFor="patient">Patient:</label>
          <div>
            <select name="patientId" id="patientId" onChange={onChange}>
              {patients.map((patient) => {
                return (
                  <option key={patient.email} value={patient.SK} onChange={onChange}>
                    {patient.firstName} {patient.lastName} - {patient.email}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className={classes.linkRadio}>
        <label>Send as:</label>
          <div>
            <input
              type="radio"
              id="phoneNumber"
              name="testType"
              value="phoneNumber"
              onChange={onChange} required
            />
            <label htmlFor="phoneNumber">Text</label>
          </div>
          <div>
            <input
              type="radio"
              id="email"
              name="testType"
              value="email"
              onChange={onChange}
            />
            <label htmlFor="email">Email</label>
          </div>
        </div>
        </div>
        </div>
        <div className={classes.emailPreview}>
          <h3>Preview</h3>
              <label>Subject:</label>
              <input type="text" name="subject" value={subject} onChange={onChange} />
              <label>Message:</label>
              <p>{previewMessage}</p>
              {/* <input type="text" name="message" value={previewMessage} onChange={onChange} /> */}
        </div>
        <div className={classes.generateLinkButton}>
          <button onClick={handleSubmit} className="buttons" id="buttons" disabled={disabled}>
            Send Link
          </button>
        </div>
      </form>
    </div>
  );
}
