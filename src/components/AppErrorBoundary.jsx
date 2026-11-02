import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="auth-page">
          <section className="auth-card" role="alert">
            <p className="provider-eyebrow">APPLICATION ERROR</p>
            <h1>This page could not be displayed</h1>
            <p>Reload the application to try again. Your saved browser-local demo data is not cleared by this error.</p>
            <button className="provider-outline-button" type="button" onClick={() => window.location.reload()}>
              Reload application
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
