import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import axios from "axios";
import { Auth } from "aws-amplify";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MDBContainer, MDBCard, MDBCardBody, MDBInput } from "mdb-react-ui-kit";
import "bootstrap/dist/css/bootstrap.min.css";
const CARD_OPTIONS = {
  iconStyle: "solid",
  style: {
    base: {
      iconColor: "#c4f0ff",
      fontWeight: 500,
      fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
      fontSize: "16px",
      fontSmoothing: "antialiased",
      ":-webkit-autofill": { color: "#f8d212" },
      "::placeholder": { color: "#000000" },
    },
    invalid: {
      iconColor: "#6a5903",
      color: "#6a5903",
    },
  },
};

export default function Payment() {
  const [email, setEmail] = useState();
  const [name, setName] = useState();
  // const [display1, setDisplay1] = useState({display: "none"});
  const [isDisabled, setIsDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const stripe = useStripe();
  const elements = useElements();

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
    setEmail(session.idToken.payload.email);
  }

  function onChange(e) {
    setName(e.target.value);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: elements.getElement(CardElement),
      billing_details: { name: name },
    });
    if (!error) {
      setIsDisabled(true);
      setLoading(true);
      try {
        const { id } = paymentMethod;
        await axios.post("/addPaymentMethod", {
          email,
          id,
        });
      } catch (error) {}
    }
    window.location.reload();
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <MDBContainer className="p-5 d-flex align-items-center justify-content-center #6D757D">
          <MDBCard className="w-45 px-5">
            <MDBCardBody>
              <div>
                <fieldset>
                  <div className="text-center mb-5">
                    <h1 className="text-center mb-5 #00ffff">New Payment Method</h1>
                    <MDBInput wrapperClass="mb-3" onChange={onChange} placeholder="Name on Card" size="sm" />
                  </div>
                  <div className="text-uppercase text-center mb-5">
                    <CardElement options={CARD_OPTIONS} />
                  </div>
                </fieldset>
              </div>
              <div className="centered-button">
                <button disabled={isDisabled} class="btn btn-primary" size="lg" id="buttons">
                  {loading ? "Processing payment method" : "Create Payment Method"}
                </button>
              </div>
            </MDBCardBody>
          </MDBCard>
        </MDBContainer>
      </form>
    </>
  );
}
