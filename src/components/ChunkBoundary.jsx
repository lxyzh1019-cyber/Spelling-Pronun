import { Component } from 'react';
import styles from './ChunkBoundary.module.css';

export class ChunkBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  static getDerivedStateFromError(err) {
    return { err };
  }

  reset = () => {
    this.setState({ err: null });
    window.location.reload();
  };

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div role="alert" className={styles.container}>
        <div className={styles.card}>
          <span className={styles.icon} aria-hidden="true">
            ⚠️
          </span>
          <h2 className={styles.title}>Page Failed to Load</h2>
          <p className={styles.message}>
            This page encountered an error. Check your internet connection and try again.
          </p>
          <button
            onClick={this.reset}
            className={styles.retryBtn}
            aria-label="Reload page"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
}
