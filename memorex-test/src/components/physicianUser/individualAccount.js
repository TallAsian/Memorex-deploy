import React from "react";
import { useState, useEffect } from "react";
import classes from "../account.module.css";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useNavigate, Link } from "react-router-dom";
import { useFormFields } from "../../lib/hooksLib";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import toggleArrowImg from "./images/toggle-arrow.png";
import toggleArrowDownImg from "./images/toggle-arrow-down.png";
import {
  MDBContainer,
  MDBRow,
  MDBCard,
} from "mdb-react-ui-kit";
import "bootstrap/dist/css/bootstrap.min.css";
import { ulid } from "ulid";


export default function PhysicianAccount() {
  const [account, setAccount] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientName, setPatientName] = useState();
  const [patientEmail, setPatientEmail] = useState();
  const [patientPhoneNumber, setPatientPhoneNumber] = useState();
  const [patientSK, setPatientSK] = useState();
  const [show, setShow] = useState(false);
  const [display, setDisplay] = useState({ display: "none" });
  const [filterPosition, setFilterPosition] = useState({ position: "absolute" });
  const [filterDisplay, setFilterDisplay] = useState({ display: "none" });
  const [toggleArrow, setToggleArrow] = useState(toggleArrowImg);
  const [filterToggle, setFilterToggle] = useState(false);
  const [dementiaLikelihood, setDementiaLikelihood] = useState("empty");
  const [sex, setSex] = useState("empty");
  const [fields, handleFieldChange] = useFormFields({
    ageMin: "0",
    ageMax: "",
  });
  const [keyword, setKeyword] = useState("");
  const baseUrl = "https://localhost:8000";
  const testId = ulid();

  const handleClose = () => setShow(false);

  function handleLink(e, currentPatient) {
    e.preventDefault();
    setPatientName(currentPatient.firstName + " " + currentPatient.lastName);
    setPatientEmail(currentPatient.email);
    setPatientPhoneNumber(currentPatient.phoneNumber);
    setPatientSK(currentPatient.SK);
    if (currentPatient.phoneNumber === "") {
      sendLink("email", currentPatient.SK);
    } else {
      setShow(true);
    }
  }

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
    const accountResponse = await axios.get(`/user/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    const patientResponse = await axios.get(`/patients/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    setAccount(accountResponse.data.Items[0]);
    setPatients(patientResponse.data.Items);
  }

  function GetAge(dateOfBirth) {
    const birthDate = new Date(dateOfBirth);
    const difference = Date.now() - birthDate.getTime();
    const ageAsDate = new Date(difference);
    const age = Math.abs(ageAsDate.getUTCFullYear() - 1970);

    return age;
  }

  async function sendLink(sendMethod, patientId) {
    let url = baseUrl + "/patient/" + patientSK + "/tests/" + testId;
    let message = "Follow this link to take your test: " + url;
    let subject = "Your test from Dr. " + account.lastName;
    if (sendMethod === "email") {
      axios({
        method: "post",
        url: "/sendPatientLinkEmail",
        data: JSON.stringify({
          PK: account.SK,
          SK: patientId,
          physicianName: account.lastName,
          subject,
          message,
          sendMethod,
          testId
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    } else if (sendMethod === "text") {
      axios({
        method: "post",
        url: "/sendPatientLinkText",
        data: JSON.stringify({
          PK: account.SK,
          SK: patientId,
          physicianName: account.lastName,
          subject,
          message,
          sendMethod,
          testId
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
    handleClose();
  }

  async function radioChange(e) {
    if (e.target.name === "sex") {
      setSex(e.target.value);
    } else if (e.target.name === "dementiaLikelihood") {
      setDementiaLikelihood(e.target.value);
    }
  }

  async function filterResults(e) {
    e.preventDefault();
    if (fields.ageMin || fields.ageMax || dementiaLikelihood !== "empty") {
      let ageMinFilter = fields.ageMin;
      let ageMaxFilter = fields.ageMax;
      if (!fields.ageMin) {
        ageMinFilter = "empty";
      }
      if (!fields.ageMax) {
        ageMaxFilter = "empty";
      }
      const session = await Auth.currentSession();
      const filteredPatientResponse = await axios.get(
        `/filteredPatients/${session.idToken.payload.email}/${dementiaLikelihood}/${sex}/${ageMinFilter}/${ageMaxFilter}`,
        {
          params: {
            idToken: session.accessToken.jwtToken,
          },
        }
      );
      setPatients(filteredPatientResponse.data);
    }
  }

  async function resetResults(e) {
    e.preventDefault();
    fields.ageMin = "";
    fields.ageMax = "";
    setDementiaLikelihood("empty");
    setSex("empty");
    const session = await Auth.currentSession();
    const patientResponse = await axios.get(`/patients/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    setPatients(patientResponse.data.Items);
  }

  async function toggleFilterVisibility(e) {
    e.preventDefault();
    if (filterToggle) {
      setFilterDisplay({ display: "none" });
      setFilterPosition({ position: "absolute" });
      setToggleArrow(toggleArrowImg);
    } else {
      setFilterDisplay({ display: "block" });
      setFilterPosition({ position: "relative" });
      setToggleArrow(toggleArrowDownImg);
    }

    setFilterToggle(!filterToggle);
  }

  async function searchPatient(search) {
    // const search = keyword;
    const session = await Auth.currentSession();
    if (search !== "") {
      try {
        const filteredPatients = await axios.get(`/searchPatients/${session.idToken.payload.email}/${search}`, {
          params: {
            idToken: session.accessToken.jwtToken,
          },
        });
        setPatients(filteredPatients.data);
      } catch (e) {
      }
    } else if (search === "") {
      const patientResponse = await axios.get(`/patients/${session.idToken.payload.email}`, {
        params: {
          idToken: session.accessToken.jwtToken,
        },
      });
      setPatients(patientResponse.data.Items);
    }
  }

  function updateSearch(search) {
    setKeyword(search);
    return search;
  }

  function SearchBar() {
    async function onChange(e) {
      let done = await updateSearch(e.target.value);
      searchPatient(e.target.value);
    }
    const pressEnter = (e) => {
      if (e.key === "Enter") {
        document.getElementById("searchButton").click();
      }
    };
    const BarStyle = { width: "20rem", background: "#F0F0F0", border: "none", padding: "0.5rem" };
    return (
      <div className="input-group d-flex">
        <div className="form-outline">
          <input
            className="form-control"
            key="search-bar"
            value={keyword}
            placeholder={"Search Patients"}
            onChange={onChange}
            onKeyDown={pressEnter}
          />
        </div>
        <button
          className="btn btn-search"
          id="searchButton"
          onClick={() => {
            searchPatient(keyword);
          }}
          onKeyDown={pressEnter}
        >
          <i className="fas fa-search"></i>
        </button>
      </div>
    );
  }

  return (
    <div>
      <section>
        <MDBContainer className="p-5 #6D757D">
          <MDBRow>
            <MDBCard>
              <div className="search-bar-div">
                <h3>Patients</h3>
                {SearchBar()}
              </div>
            </MDBCard>
            <div className={classes.scrollTable}>
            <table className={classes.tableWrapper}>
              <thead>
                <tr>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Age</th>
                  <th></th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => {
                  return (
                    <tr key={patient.email}>
                      <td>{patient.firstName}</td>
                      <td>{patient.lastName}</td>
                      <td>{GetAge(patient.dateOfBirth)}</td>
                      <td>
                        <Link to="/testHistory" state={{ PK: patient.PK, SK: patient.SK }}>
                          Test History
                        </Link>
                      </td>
                      <td>
                        <Link to="/editPatient" state={{ PK: patient.PK, SK: patient.SK }}>
                          Edit Patient
                        </Link>
                      </td>
                      <td>
                        <button className="text-buttons" onClick={(e) => handleLink(e, patient)}>
                          Send Test
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td>
                    <Link to="/newPatientForm">Add Patient</Link>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>

            <div className="Modal" style={display}>
              <Modal show={show} onHide={handleClose}>
                <div>
                  <div>
                    <Modal.Header>
                      <Modal.Title>Sending test link to {patientName}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <p>Would you like to send the link in an email or text?</p>
                    </Modal.Body>
                    <Modal.Footer>
                      <Button variant="secondary" onClick={() => sendLink("text", patientSK)}>
                        Text - {patientPhoneNumber}
                      </Button>
                      <Button variant="primary" onClick={() => sendLink("email", patientSK)}>
                        Email - {patientEmail}
                      </Button>
                    </Modal.Footer>
                  </div>
                </div>
              </Modal>
            </div>
            <MDBCard>
            </MDBCard>
          </MDBRow>
        </MDBContainer>
              <div className={classes.filters}>
                <form className={classes.allFilters}>
                  <h3 style={filterPosition} className={classes.filterTitle}>
                    Filters{" "}
                    <button className={classes.arrowImg} onClick={toggleFilterVisibility}>
                      <img src={toggleArrow} alt="toggle-arrow.png" />
                    </button>
                  </h3>
                  <div style={filterDisplay}>
                    <div className={classes.filterForm}>
                      <div className={classes.filterSection}>
                        <h4>Dementia Likelihood</h4>
                        <div>
                          <input
                            class="form-check-input"
                            type="radio"
                            id="low"
                            name="dementiaLikelihood"
                            value="Low"
                            checked={dementiaLikelihood === "Low"}
                            onChange={radioChange}
                          />
                          <label class="form-check-label" htmlFor="low">
                            Low
                          </label>
                        </div>
                        <div>
                          <input
                            class="form-check-input"
                            type="radio"
                            id="medium"
                            name="dementiaLikelihood"
                            value="Medium"
                            checked={dementiaLikelihood === "Medium"}
                            onChange={radioChange}
                          />
                          <label class="form-check-label" htmlFor="medium">
                            Medium
                          </label>
                        </div>
                        <div>
                          <input
                            class="form-check-input"
                            type="radio"
                            id="high"
                            name="dementiaLikelihood"
                            value="High"
                            checked={dementiaLikelihood === "High"}
                            onChange={radioChange}
                          />
                          <label class="form-check-label" htmlFor="high">
                            High
                          </label>
                        </div>
                      </div>
                      <div className={classes.filterSection}>
                        <h4>Sex</h4>
                        <div>
                          <input
                            class="form-check-input"
                            type="radio"
                            id="female"
                            name="sex"
                            value="Female"
                            checked={sex === "Female"}
                            onChange={radioChange}
                          />
                          <label class="form-check-label" htmlFor="female">
                            Female
                          </label>
                        </div>
                        <div>
                          <input
                            class="form-check-input"
                            type="radio"
                            id="male"
                            name="sex"
                            value="Male"
                            checked={sex === "Male"}
                            onChange={radioChange}
                          />
                          <label class="form-check-label" htmlFor="male">
                            Male
                          </label>
                        </div>
                        <div>
                          <input
                            class="form-check-input"
                            type="radio"
                            id="other"
                            name="sex"
                            value="Other"
                            checked={sex === "Other"}
                            onChange={radioChange}
                          />
                          <label class="form-check-label" htmlFor="other">
                            Other
                          </label>
                        </div>
                      </div>
                      <div className={classes.filterSection}>
                        <h4>Age</h4>
                        <input
                          type="number"
                          id="ageMin"
                          name="ageMin"
                          value={fields.ageMin}
                          onChange={handleFieldChange}
                        />
                        <label>To</label>
                        <input
                          type="number"
                          id="ageMax"
                          name="ageMax"
                          value={fields.ageMax}
                          onChange={handleFieldChange}
                        />
                      </div>
                    </div>
                    <div className={classes.filterButtons}>
                      <button onClick={resetResults}>Reset Filters</button>
                      <button onClick={filterResults}>Apply Filters</button>
                    </div>
                  </div>
                </form>
              </div>
      </section>
    </div>
  );
}
