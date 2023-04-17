import React from "react";
import { useState, useEffect } from "react";
import classes from "../account.module.css";
import "./adminUser.css";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useNavigate, Link } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import {MDBContainer, MDBRow, MDBCard,} from "mdb-react-ui-kit";

export default function AdminAccount() {
  const [account, setAccount] = useState([]);
  const [physicians, setPhysicians] = useState([]);
  const [show, setShow] = useState(false);
  const [myEmail, setMyEmail] = useState();
  const [display1, setDisplay1] = useState({ display: "none" });
  const [keyword, setKeyword] = useState("");

  const AWS = require("aws-sdk");
  AWS.config.update({
    accessKeyId: "AKIAX3FHVXYSIVRBPHGJ",
    secretAccessKey: "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",
    region: "us-east-2",
  });

  const handleClose = () => setShow(false);

  function handleDelete(theEmail) {
    setShow(true);
    setMyEmail(theEmail);
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
    const physicianResponse = await axios.get(`/physicians/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    setAccount(accountResponse.data.Items[0]);
    setPhysicians(physicianResponse.data.Items);
  }

  async function searchPhysician(search) {
    // const search = keyword;
    const session = await Auth.currentSession();
    if (search !== "") {
      try {
        const filteredPhysicians = await axios.get(`/searchPhysicians/${session.idToken.payload.email}/${search}`, {
          params: {
            idToken: session.accessToken.jwtToken,
          },
        });
        setPhysicians(filteredPhysicians.data);
      } catch (e) {
      }
    } else if (search === "") {
      const physicianResponse = await axios.get(`/physicians/${session.idToken.payload.email}`, {
        params: {
          idToken: session.accessToken.jwtToken,
        },
      });
      setPhysicians(physicianResponse.data.Items);
    }
  }

  function updateSearch(search) {
    setKeyword(search);
    return search;
  }

  function SearchBar() {
    async function onChange(e) {
      let done = await updateSearch(e.target.value);
      searchPhysician(e.target.value);
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
            placeholder={"Search Physicians"}
            onChange={onChange}
            onKeyDown={pressEnter}
          />
        </div>
        <button
          className="btn btn-search"
          id="searchButton"
          onClick={() => {
            searchPhysician(keyword);
          }}
          onKeyDown={pressEnter}
        >
          <i className="fas fa-search"></i>
        </button>
      </div>
    );
  }

  async function lockAccount(email) {
    var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
    let user = await getUsername(email);
    let username = user.Username;
    let securityLevel = user.Attributes[1].Value;

    var params;

    if (securityLevel === "2") {
      params = {
        UserAttributes: [
          {
            Name: "custom:securityLevel",
            Value: "3",
          },
        ],
        UserPoolId: "us-east-2_tZIGe1Zgs",
        Username: username,
      };
    } else if (securityLevel === "3") {
      params = {
        UserAttributes: [
          {
            Name: "custom:securityLevel",
            Value: "2",
          },
        ],
        UserPoolId: "us-east-2_tZIGe1Zgs",
        Username: username,
      };
    }

    cognitoidentityserviceprovider.adminUpdateUserAttributes(params, (err, data) => {});

    axios({
      method: "post",
      url: "/lockPhysician",
      data: JSON.stringify({
        email: email,
        securityLevel: securityLevel,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const session = await Auth.currentSession();
    const physicianResponse = await axios.get(`/physicians/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    setPhysicians(physicianResponse.data.Items);
  }

  async function deleteUser(email) {
    setDisplay1({ display: "inline" });
    var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
    let user = await getUsername(email);
    let username = user.Username;
    const params = {
      UserPoolId: "us-east-2_tZIGe1Zgs",
      Username: username,
    };
    cognitoidentityserviceprovider.adminDeleteUser(params, (err, data) => {});

    axios({
      method: "post",
      url: "/deletePhysician",
      data: JSON.stringify({
        email: email,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const session = await Auth.currentSession();
    const physicianResponse = await axios.get(`/physicians/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    setPhysicians(physicianResponse.data.Items);
    handleClose();
  }
  

  async function getUsername(email) {
    let myEmail = 'email = "' + email + '"';
    var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
    var params = {
      UserPoolId: "us-east-2_tZIGe1Zgs",
      AttributesToGet: ["sub", "custom:securityLevel"],
      Filter: myEmail,
    };

    let userList = await cognitoidentityserviceprovider.listUsers(params).promise();

    return userList.Users[0];
  }
  return (
    <section>
      <MDBContainer className=" p-5">
        <MDBRow>
          <MDBCard>
            <div className="search-bar-div">
              <h3>Physicians</h3>
              {SearchBar()}
            </div>
          </MDBCard>
          <div className={classes.scrollTable}>
            <table className={classes.tableWrapper}>
              <thead className="tableHead">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Specialty</th>
                  <th>Clinic</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {physicians.map((physician) => {
                  return (
                    <tr key={physician.email}>
                      <td>
                        {physician.firstName} {physician.lastName}
                      </td>
                      <td>{physician.email}</td>
                      <td>{physician.phoneNumber}</td>
                      <td>{physician.specialty}</td>
                      <td>{physician.clinicName}</td>
                      <td>
                        <button className="text-buttons" onClick={() => lockAccount(physician.email)}>
                          {physician.securityLevel === 2 ? "Lock" : "Unlock"} Physician
                        </button>
                      </td>
                      <td>
                        <button className="text-buttons" onClick={() => handleDelete(physician.email)}>
                          Delete Physician
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colspan="6">
                    <Link to="/newPhysicianForm">Add Physician</Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="Modal" style={display1}>
            <Modal show={show} onHide={handleClose}>
              <div>
                <div>
                  <Modal.Header>
                    <Modal.Title>Delete User: {myEmail}?</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <p>Are you sure you want to delete this Physician?</p>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                      No
                    </Button>
                    <Button variant="primary" onClick={() => deleteUser(myEmail)}>
                      Yes
                    </Button>
                  </Modal.Footer>
                </div>
              </div>
            </Modal>
          </div>
        </MDBRow>
      </MDBContainer>
    </section>
  );
}
