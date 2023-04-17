import { Link } from "react-router-dom";
import classes from "./navigation.module.css";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { NavItem, NavIcon, NavText } from "@trendmicro/react-sidenav";
import "@trendmicro/react-sidenav/dist/react-sidenav.css";
import "./navigation.css";
import setButton from "./images/settings.png";
import React, { useRef } from "react";

export default function Navigation() {
  const [accountPath, setAccountPath] = useState();
  const [editAccountPath, setEditAccountPath] = useState();
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState({ display: "none" });
  const [paymentDisplay, setPaymentDisplay] = useState({ display: "none" });

  let menuRef = useRef();

  useEffect(() => {
    let handler = (e) => {
      if (!menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  });
  useEffect(() => {
    getSession();
  }, []);
  let navigate = useNavigate();
  const pageChange = () => {
    let path = "/";
    navigate(path);
  };

  async function handleLogOut() {
    Auth.signOut();
    pageChange();
  }
  //Hayden was here
  async function getSession() {
    const session = await Auth.currentSession();
    const paymentMethodInvalid = await axios.get(`/subscription/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    if (paymentMethodInvalid.data) {
      setDisplay({ display: "block" });
    } else {
      setDisplay({ display: "none" });
    }
    if (session.idToken.payload["custom:securityLevel"] === "0") {
      setAccountPath("/adminAccount");
      setEditAccountPath("/editAccount");
      setPaymentDisplay({ display: "inline-block" });
    } else if (session.idToken.payload["custom:securityLevel"] === "1") {
      setAccountPath("/individualAccount");
      setEditAccountPath("/editIndividualAccount");
      setPaymentDisplay({ display: "inline-block" });
    } else if (session.idToken.payload["custom:securityLevel"] === "2") {
      setAccountPath("/physicianAccount");
      setEditAccountPath("/editPhysicianAccount");
      setPaymentDisplay({ display: "none" });
    }
  }

  return (
    <div>
      <header className={classes.bar}>
        <nav className={classes.navbar}>
          <h4>
          <Link to={accountPath}>Account</Link>
          </h4>
        </nav>
      </header>
      <h4 style={display} className={classes.invalidSubscription}>
        Your account does not have a valid subscription. Please fix this to resume services.
      </h4>
      <div>
        <div ref={menuRef} className="position-absolute top-0 start-0 settings-menu">
          <NavItem
            onClick={() => {
              setOpen(!open);
            }}
          >
            <NavIcon>
              <img className={classes.imgSettings} src={setButton} alt="settings.png" />
            </NavIcon>
            <div>
              <NavItem className={`dropdownMenu ${open ? "active" : "inactive"}`}>
                <NavItem>
                  <NavText>
                    <Link to="/changePas">
                      <button className="buttonStyle">Change Password</button>
                    </Link>
                  </NavText>
                </NavItem>
                <NavItem>
                  <NavText>
                    <Link to="/updatePayment">
                      <button style={paymentDisplay} className="buttonStyle">
                        Payment Methods
                      </button>
                    </Link>
                  </NavText>
                </NavItem>
                <NavItem>
                  <NavText>
                    <Link to={editAccountPath}>
                      <button className="buttonStyle">Edit Account</button>
                    </Link>
                  </NavText>
                </NavItem>
                <NavItem>
                  <NavText>
                    <li>
                      <button className="buttonStyle" onClick={handleLogOut}>
                        Sign Out
                      </button>
                    </li>
                  </NavText>
                </NavItem>
              </NavItem>
            </div>
          </NavItem>
        </div>
      </div>
    </div>
  );
}
