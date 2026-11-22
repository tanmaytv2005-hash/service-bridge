import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <main className="wrap narrow">
      <Link to="/">← Back to ServiceBridge</Link>
      <h1>ServiceBridge Demo Terms</h1>

      <section className="card">
        <p>
          ServiceBridge is a college project prototype for demonstration.
          It does not provide real service bookings or payments.
        </p>
        <p>
          Razorpay Test Mode payments and referral credits are simulated and
          do not move real money.
        </p>
        <p>
          Use only the dummy Aadhaar numbers supplied for this demo. Do not
          enter real identity or payment information.
        </p>
      </section>
    </main>
  );
}