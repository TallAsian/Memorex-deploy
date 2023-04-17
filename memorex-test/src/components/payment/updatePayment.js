import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import "./payment.css";
import { MDBContainer, MDBCard, MDBCardBody } from "mdb-react-ui-kit";
import Payment from "./Payment";
import "bootstrap/dist/css/bootstrap.min.css";
export default function UpdatePayment() {
  const initialFormState = {
    formType: "updatePaymentMethod",
  };

  /// Use States
  const [card, setCard] = useState([]);
  const [subId, setSubId] = useState();
  const [loading, setLoading] = useState(false);
  const [formState, updateFormState] = useState(initialFormState);
  const [cancelled, setCancelled] = useState();
  const [defaultCard, setDefaultCard] = useState();
  const [isDisabled, setIsDisabled] = useState(true);
  const [subEndDate, setSubEndDate] = useState();
  const [productType, setProductType] = useState();

  const { formType } = formState;

  /// navigate method called
  let navigate = useNavigate();

  /// useEffect used to load the getSession() function on page load
  useEffect(() => {
    getSession();
  }, []);

  ///Various information is called in this function. Information from DynamoDB, Stripe and Cognito.
  async function reloadPage() {
    /// Loading is set to true while data is being fetched.
    setLoading(true);
    const session = await Auth.currentSession();

    ///The Form State is set to the update payment method page.
    updateFormState(() => ({ ...formState, formType: "updatePaymentMethod" }));

    ///A GET method is sent through axios that takes in the current session's email to receive information about a Stripe Customer.
    const myCustomer = await axios.get(`/showCustomer/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });

    ///Attribute for the default payment method that a customer has set.
    ///Later used to compare the selected card id to the current default payment method.
    setDefaultCard(myCustomer.data.data[0].invoice_settings.default_payment_method);

    ///A GET method is sent through axios that takes in the current session's email to receive payment information about a Stripe Customer.
    const myPayment = await axios.get(`/showPayment/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });

    ///A list of payment methods that the customer owns is returned and is set through setCard();
    setCard(myPayment.data.data);

    ///A GET method is sent through axios that takes in
    ///the current session's email to receive the current product information associated with the customer.
    const myCurrentProduct = await axios.get(`/currentProduct/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });

    ///A GET method is sent through axios that takes in
    ///the current session's email to receive the current subscription information.
    const mySubscription = await axios.get(`/currentSubscription/${session.idToken.payload.email}/""`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });

    const mySubscriptionSchedule = await axios.get(`/currentSubscriptionSchedule/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    const endDate = new Date(mySubscription.data.data[0].current_period_end * 1000);
    function formatDate(newDate) {
      const months = {
        0: "January",
        1: "February",
        2: "March",
        3: "April",
        4: "May",
        5: "June",
        6: "July",
        7: "August",
        8: "September",
        9: "October",
        10: "November",
        11: "December",
      };
      const d = newDate;
      const year = d.getFullYear();
      const date = d.getDate();
      const monthIndex = d.getMonth();
      const monthName = months[d.getMonth()];
      const formatted = `${monthName} ${date}, ${year}`;
      return formatted.toString();
    }
    setSubEndDate(formatDate(endDate));
    console.log(mySubscriptionSchedule.data.data[0].phases[1].items[0]);
    getNextProductType(mySubscriptionSchedule.data.data[0].phases[1].items[0].plan);

    ///A list of the subscriptions is checked to see if any of them are active and if so, checks to see if any
    ///are set to be canceled at the end of the subscription period end. the "canceled" useState is set to false if
    ///a subscription is being canceled and true if it is not. The canceled variable is used to decided what button is being shown.
    for (let i = 0; i < mySubscription.data.data.length; i++) {
      if (mySubscription.data.data[i].status === "active") {
        if (mySubscriptionSchedule.data.data[0].end_behavior === "release") {
          setCancelled(false);
        } else if (mySubscriptionSchedule.data.data[0].end_behavior === "cancel") {
          setCancelled(true);
        }
      }
    }

    // setProductType(myCurrentProduct.data.name);

    ///Depending on what the current subscription is, the subId is set accordingly on the radio buttons on page load.
    if (myCurrentProduct.data.name === "Monthly") {
      setSubId("1");
    } else if (myCurrentProduct.data.name === "Half-year") {
      setSubId("2");
    } else if (myCurrentProduct.data.name === "Yearly") {
      setSubId("3");
    }

    /// Loading is set to false once data is done being fetched.
    setLoading(false);
  }

  /// this function checks if a session exists and redirects the user to an "accessed denied" page if a session is not found.
  /// The reloadPage function is called at the end to re fetch data.
  async function getSession() {
    try {
      const session = await Auth.currentSession();
    } catch {
      let path = "/accessDenied";
      navigate(path);
    }
    reloadPage();
  }

  ///When the select button is clicked, the function takes in an ID parameter of the specific card who's button was clicked.
  ///A GET method is sent through axios that takes in the current session's email and the selected card's id, a default card
  ///is then selected through the python backend.
  async function onSelectCard(cardId) {
    const session = await Auth.currentSession();
    await axios.get(`/setDefaultCard/${session.idToken.payload.email}/${cardId}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    reloadPage();
  }

  ///When a radio button is clicked, the subId is set to which subscription type was chosen.
  function onChange(e) {
    if (e.target.value === "1") {
      setSubId("1");
    } else if (e.target.value === "2") {
      setSubId("2");
    } else if (e.target.value === "3") {
      setSubId("3");
    }
  }

  ///
  async function onDelete(cardId) {
    setLoading(true);
    const session = await Auth.currentSession();
    await axios.get(`/showPayment/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    const myCustomer = await axios.get(`/showCustomer/${session.idToken.payload.email}`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    const mySubscription = await axios.get(`/currentSubscription/${session.idToken.payload.email}/""`, {
      params: {
        idToken: session.accessToken.jwtToken,
      },
    });
    if (myCustomer.data.data[0].invoice_settings.default_payment_method !== cardId) {
      await axios.get(`/deletePaymentMethod/${cardId}`, {
        params: {
          idToken: session.accessToken.jwtToken,
        },
      });
      reloadPage();
    } else {
      for (let i = 0; i < mySubscription.data.data.length; i++) {
        if (mySubscription.data.data[i].status === "active") {
          alert("You have an ongoing subscription");
        } else {
          await axios.get(`/deletePaymentMethod/${cardId}`, {
            params: {
              idToken: session.accessToken.jwtToken,
            },
          });
          reloadPage();
        }
      }
    }
  }

  async function Subscription(buttonType) {
    setLoading(true);
    const session = await Auth.currentSession();
    if (buttonType === "Update") {
      const test = await axios.get(`updateSubscription/${session.idToken.payload.email}/${subId}`, {
        params: {
          idToken: session.accessToken.jwtToken,
        },
      });
      console.log(test);
      getNextProductType(test.data);
    } else {
      await axios.get(`/currentSubscription/${session.idToken.payload.email}/${buttonType}`, {
        params: {
          idToken: session.accessToken.jwtToken,
        },
      });
    }
    reloadPage();
  }

  function getNextProductType(price) {
    if (price === "price_1MtB2YAB1aJ9omUKvqVzgOUo") {
      setProductType("Monthly");
    } else if ((price === "price_1MtB75AB1aJ9omUKdt0ReJ2q")) {
      setProductType("Half-Year");
    } else if ((price === "price_1MtB7QAB1aJ9omUKehQkMT0U")) {
      setProductType("Yearly");
    }
  }

  return (
    <div>
      {loading ? (
        <h1>Loading Payment Information...</h1>
      ) : (
        <div>
          {formType === "updatePaymentMethod" && (
            <div>
              <p>Card Information</p>
              {card.map((myCard) => {
                return (
                  <MDBContainer>
                    <MDBCard>
                      <MDBCardBody>
                        <div>
                          <table>
                            <thead>
                              <tr>
                                <th></th>
                                <th></th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>
                                  <ul key={myCard.id}>
                                    <li>{myCard.billing_details.name}</li>
                                    <li>**** **** **** {myCard.card.last4}</li>
                                    <li>{myCard.card.brand}</li>
                                    <li>{myCard.card.date}</li>
                                  </ul>
                                </td>
                                <td>
                                  <div className="centered-buttons">
                                    <button
                                      class="btn btn-primary"
                                      size="lg"
                                      id="buttons"
                                      onClick={() => onSelectCard(myCard.id)}
                                      disabled={defaultCard === myCard.id}
                                    >
                                      {defaultCard === myCard.id ? "Selected" : "Select"}
                                    </button>
                                  </div>
                                </td>
                                <td>
                                  <div className="centered-buttons">
                                    <button
                                      class="btn btn-primary"
                                      size="lg"
                                      id="buttons"
                                      onClick={() => onDelete(myCard.id)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </MDBCardBody>
                    </MDBCard>
                  </MDBContainer>
                );
              })}
              <div className="centered-buttons">
                <button
                  class="btn btn-primary"
                  size="lg"
                  id="buttons"
                  onClick={() =>
                    updateFormState(() => ({
                      ...formState,
                      formType: "addPayment",
                    }))
                  }
                >
                  Add Payment Method
                </button>
              </div>
              <p>Subscription Type after {subEndDate}</p>
              <p>{productType}</p>
              <MDBContainer>
                <MDBCard>
                  <MDBCardBody>
                    <div className="register-radio">
                      <input
                        name="subscription"
                        id="1"
                        onChange={onChange}
                        wrapperClass="mb-3"
                        type="radio"
                        value="1"
                        checked={productType === "Monthly"}
                      />
                      <label className="text-center mb-2" htmlFor="1">
                        1 Month $150
                      </label>
                      <input
                        name="subscription"
                        id="2"
                        onChange={onChange}
                        wrapperClass="mb-3"
                        type="radio"
                        value="2"
                        checked={productType === "Half-Year"}
                      />
                      <label className="text-center mb-2" htmlFor="2">
                        6 Months $900
                      </label>
                      <input
                        name="subscription"
                        id="3"
                        onChange={onChange}
                        wrapperClass="mb-3"
                        type="radio"
                        value="3"
                        checked={productType === "Yearly"}
                      />
                      <label className="text-center mb-2" htmlFor="3">
                        12 Months $1800
                      </label>
                    </div>
                    <div>
                      <div className="centered-buttons">
                        <button class="btn btn-primary" size="lg" id="buttons" onClick={() => Subscription("Update")}>
                          Update Subscription
                        </button>
                        {cancelled ? (
                          <button class="btn btn-primary" size="lg" id="buttons" onClick={() => Subscription("Resume")}>
                            Resume Subscription
                          </button>
                        ) : (
                          <button class="btn btn-primary" size="lg" id="buttons" onClick={() => Subscription("Cancel")}>
                            Cancel Subscription
                          </button>
                        )}
                      </div>
                    </div>
                  </MDBCardBody>
                </MDBCard>
              </MDBContainer>
            </div>
          )}
          {formType === "addPayment" && <Payment />}
        </div>
      )}
    </div>
  );
}
