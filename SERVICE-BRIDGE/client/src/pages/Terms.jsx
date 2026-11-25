import { Link } from 'react-router-dom';
import '../phase2.css';

export default function Terms() {
  return (
    <main className="wrap">
      <Link to="/register">Back to sign up</Link>
      <h1>ServiceBridge Terms &amp; Conditions</h1>
      <p className="card"><strong>College project demo:</strong> These terms describe this prototype. They are not a complete legal agreement for a public or commercial launch.</p>

      <section className="card">
        <h2>1. Using the demo</h2>
        <p>ServiceBridge is a prototype for discovering local home-service professionals, requesting quotations, making bookings, and reviewing completed work. Use it for demonstration and testing only.</p>
      </section>

      <section className="card">
        <h2>2. Customer and professional accounts</h2>
        <p>Customers can request services and compare quotations. Professionals can apply to offer services, subject to the app’s admin review. Identity and document checks in this demo do not guarantee a person’s skills, work quality, or conduct.</p>
      </section>

      <section className="card">
        <h2>3. Demo bookings and payments</h2>
        <p>Payments made with Razorpay Test Mode are simulated and do not transfer real money. The app’s “Mark as paid” payout action records a demo status only; it does not send money to a professional. A displayed settlement or payout record is not proof of a real transfer.</p>
      </section>

      <section className="card">
        <h2>4. Customer referral program</h2>
        <ul>
          <li>Referrals are for customers inviting other customers. Professional accounts cannot refer users or earn referral credit.</li>
          <li>The invited customer must use the referral code when creating a customer account.</li>
          <li>A referral reward is not earned for signup alone. The referrer earns ₹100 in demo credit after the invited customer completes and pays for their first booking.</li>
          <li>Demo credit is only displayed in this prototype. It is not cash, cannot be withdrawn, and cannot be applied to a real payment.</li>
          <li>Self-referrals, duplicate or false accounts, and attempts to manipulate rewards are not eligible. If the qualifying booking is refunded, the demo credit is reversed.</li>
        </ul>
      </section>

      <section className="card">
        <h2>5. Demo identity and photos</h2>
        <p>Use only the synthetic Aadhaar test numbers supplied with the project. The checksum check is not government identity verification. A camera photo is not a liveness check. Do not enter real Aadhaar numbers or other sensitive personal data in this demo.</p>
      </section>

      <section className="card">
        <h2>6. Safe and fair use</h2>
        <p>Do not create false accounts, misuse another person’s information, submit misleading details, or use the demo to arrange unsafe or unlawful work. If a booking or payment looks incorrect, contact the project administrator before relying on its displayed status.</p>
      </section>
    </main>
  );
}
