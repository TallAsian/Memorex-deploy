import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Auth } from "aws-amplify";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import React, { Component } from "react";
import Navigation from "./components/navigation/navigation";
import AdminAccount from "./components/adminUser/adminAccount";
import PhysicianAccount from "./components/physicianUser/physicianAccount";
import IndividualAccount from "./components/physicianUser/individualAccount";
import AccessDenied from "./components/auth/accessDenied";
import NewPhysicianForm from "./components/physicianUser/newPhysicianForm";
import NewPatientForm from "./components/patients/newPatientForm";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import ChangePas from "./components/settingsButton/changePas";
import EditAccount from "./components/adminUser/editAccount";
import EditPhysicianAccount from "./components/physicianUser/editPhysicianAccount";
import EditIndividualAccount from "./components/physicianUser/editIndividualAccount";
import EditPatient from "./components/patients/editPatient";
import GenerateLink from "./components/patients/generateLink";
import TestHistory from "./components/patients/testHistory";
import UpdatePayment from "./components/payment/updatePayment";
import FileUploadTest from "./components/fileUploadTest";

const PUBLIC_KEY =
  "pk_test_51MjQdBAB1aJ9omUKBhuJXUENKooshYFgFBMIFvmmkkn5ypuKu0X1E2eWTVOvuaTiOukSlCzU08hT4uc0hkBoZVTt00LPm9s6TL";
const stripeTestPromise = loadStripe(PUBLIC_KEY);

class App extends Component {
  state = {
    isAuthenticated: false,
    isAuthenticating: true,
    user: null,
  };

  setAuthStatus = (authenticated) => {
    this.setState({ isAuthenticated: authenticated });
  };

  setUser = (user) => {
    this.setState({ user: user });
  };

  async componentDidMount() {
    try {
      const session = await Auth.currentSession();
      this.setAuthStatus(true);
      const user = await Auth.currentAuthenticatedUser();
      this.setUser(user);
    } catch (error) {
      if (error !== "No current user") {
      }
    }

    this.setState({ isAuthenticating: false });
  }

  render() {
    const authProps = {
      isAuthenticated: this.state.isAuthenticated,
      user: this.state.user,
      setAuthStatus: this.setAuthStatus,
      setUser: this.setUser,
    };
    return (
      !this.state.isAuthenticating && (
        <div className="App">
          <Elements stripe={stripeTestPromise}>
            <Router>
              <Routes>
                <Route
                  path="/newPhysicianForm"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <NewPhysicianForm />
                    </>
                  }
                ></Route>
                <Route
                  path="/newPatientForm"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <NewPatientForm />
                    </>
                  }
                ></Route>
                <Route
                  path="/adminAccount"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <AdminAccount />
                    </>
                  }
                ></Route>
                <Route
                  path="/physicianAccount"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <PhysicianAccount />
                    </>
                  }
                ></Route>
                <Route
                  path="/individualAccount"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <IndividualAccount />
                    </>
                  }
                ></Route>
                <Route
                  path="/changePas"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <ChangePas />
                    </>
                  }
                ></Route>
                <Route
                  path="/editAccount"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <EditAccount />
                    </>
                  }
                ></Route>
                <Route
                  path="/editPhysicianAccount"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <EditPhysicianAccount />
                    </>
                  }
                ></Route>
                <Route
                  path="/editIndividualAccount"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <EditIndividualAccount />
                    </>
                  }
                ></Route>
                <Route
                  path="/editPatient"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <EditPatient />
                    </>
                  }
                ></Route>
                <Route
                  path="/generateLink"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <GenerateLink />
                    </>
                  }
                ></Route>
                <Route
                  path="/testHistory"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <TestHistory />
                    </>
                  }
                ></Route>
                <Route
                  path="/updatePayment"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <UpdatePayment />
                    </>
                  }
                ></Route>
                <Route
                  path="/fileUploadTest"
                  element={
                    <>
                      <Navigation auth={authProps} />
                      <FileUploadTest />
                    </>
                  }
                ></Route>
                <Route path="/" element={<Login />}></Route>
                <Route path="/register" element={<Register />}></Route>
                <Route path="/accessDenied" element={<AccessDenied />}></Route>
              </Routes>
            </Router>
          </Elements>
        </div>
      )
    );
  }
}

export default App;
