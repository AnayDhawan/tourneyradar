"use client";

import BaseLayout from "@/components/BaseLayout";

const heading = { fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" };
const body = { color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 };
const list = { ...body, paddingLeft: "1.25rem", listStyle: "disc" };

export default function PrivacyPage() {
  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>Privacy <span className="highlight">Policy</span></>}
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "800px" }}>
          <div className="card">
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Last updated: November 2026
            </p>

            <h3 style={heading}>1. Who runs TourneyRadar</h3>
            <p style={body}>
              TourneyRadar is run by Anay Dhawan, an individual based in India, who is the data controller for this site. For anything about your data, email dhawansanay@gmail.com.
            </p>

            <h3 style={heading}>2. What we collect</h3>
            <ul style={list}>
              <li><strong>Account:</strong> your name, email and password. The password is stored as a hash by our login provider and we cannot read it.</li>
              <li><strong>Optional profile details:</strong> phone number, FIDE ID, rating, city, country, home country and state, your role, why you use the site, how you heard about us, who referred you, and your email preferences.</li>
              <li><strong>Age confirmation:</strong> whether you confirmed at signup that you are 16 or older, or that a parent or guardian has agreed.</li>
              <li><strong>Saved tournaments:</strong> the tournaments you add to your wishlist.</li>
              <li><strong>FIDE rating history:</strong> if you add a FIDE ID, we fetch your public rating history from FIDE and store it. It is public data and can be read through this site.</li>
              <li><strong>Feedback:</strong> your star rating, comment and the page you sent it from, linked to your account only if you are logged in.</li>
              <li><strong>Usage:</strong> pages visited, features used, browser and device type, your country, and technical errors.</li>
            </ul>

            <h3 style={heading}>3. Why we use it, and our legal basis</h3>
            <ul style={list}>
              <li><strong>Running your account, wishlist and recommendations:</strong> necessary to provide the service you asked for (contract).</li>
              <li><strong>Weekly tournament emails:</strong> only if you switch them on (consent). Every email has an unsubscribe link, and you can turn them off in your settings.</li>
              <li><strong>Analytics, error tracking and feedback:</strong> our legitimate interest in knowing which features are useful and keeping the site working. You can object at any time.</li>
            </ul>
            <p style={body}>
              We do not sell your data and we do not show ads.
            </p>

            <h3 style={heading}>4. Analytics</h3>
            <p style={body}>
              We use Umami and Vercel Analytics, which do not use cookies, and PostHog, hosted in the EU. PostHog is set up to keep its identifier in memory only, so it stores no cookie or browser data and forgets you when you close the page. If you are logged in, PostHog events are linked to your account ID. Your name and email are not sent to it.
            </p>

            <h3 style={heading}>5. Cookies and browser storage</h3>
            <ul style={list}>
              <li><strong>One cookie:</strong> <code>tr_geo_country</code> holds your country code for one day, so nearby tournaments can be shown first.</li>
              <li><strong>Login session:</strong> kept in your browser storage while you are logged in.</li>
              <li><strong>Preferences in local storage:</strong> your theme, a visit counter and the time of your last visit (used to decide when to ask for feedback), prompts you have dismissed, the last update you have seen, and a referral code if you arrived through one.</li>
            </ul>
            <p style={body}>
              The visit counter is included in the analytics event sent when the feedback prompt appears. The rest stays in your browser. You can clear all of it in your browser settings at any time.
            </p>

            <h3 style={heading}>6. Who receives your data</h3>
            <ul style={list}>
              <li><strong>Supabase:</strong> database and login, hosted on AWS in the US.</li>
              <li><strong>Vercel:</strong> website hosting and page-view analytics.</li>
              <li><strong>PostHog and Umami:</strong> analytics.</li>
              <li><strong>Resend:</strong> sends email, if you switch emails on.</li>
              <li><strong>OpenStreetMap:</strong> map images load directly from its servers, which see your IP address.</li>
              <li><strong>FIDE:</strong> receives your FIDE ID when we look up your rating history.</li>
            </ul>

            <h3 style={heading}>7. Transfers outside the EEA and UK</h3>
            <p style={body}>
              Some of these providers process data in the US, and TourneyRadar is run from India, so your data can leave the EEA and UK. We rely on each provider&apos;s data processing terms for these transfers.
            </p>

            <h3 style={heading}>8. How long we keep it</h3>
            <p style={body}>
              Account details, saved tournaments and rating history are kept until you delete your account. Feedback is kept until it is no longer useful or you ask us to remove it. Analytics data is kept for the retention period set in each analytics tool.
            </p>

            <h3 style={heading}>9. Your rights</h3>
            <p style={body}>
              You can ask us for a copy of your data, to correct it, to delete it, to restrict or object to how we use it, or to send it to you in a portable format. You can withdraw consent at any time. Email dhawansanay@gmail.com and we will respond within one month. Deleting your account removes your account details, saved tournaments and linked analytics. If you are in the EEA or UK, you can also complain to your local data protection authority.
            </p>

            <h3 style={heading}>10. Children</h3>
            <p style={body}>
              If you are under 16, a parent or guardian must agree before you create an account, and we record that you confirmed this at signup. A parent or guardian can ask to see or delete a child&apos;s data by emailing dhawansanay@gmail.com. If we learn that an account was created without that agreement, we delete it.
            </p>

            <h3 style={heading}>11. Tournament listings</h3>
            <p style={{ ...body, marginBottom: 0 }}>
              Listings come from public sources such as Chess-Results and can include an organizer&apos;s name. To correct or remove one, email dhawansanay@gmail.com.
            </p>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
