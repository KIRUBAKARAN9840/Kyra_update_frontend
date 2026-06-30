/**
 * Performance Monitor - Development Only
 * Tracks memory usage, render performance, and potential leaks
 */

class PerformanceMonitor {
  constructor() {
    this.startTime = Date.now();
    this.renderCounts = new Map();
    this.memorySnapshots = [];
    this.intervalId = null;
  }

  start() {
    if (!__DEV__) return;

    console.log('📊 Performance Monitor Started');

    // Track memory every 30 seconds
    this.intervalId = setInterval(() => {
      this.captureMemorySnapshot();
    }, 30000);

    // Initial snapshot
    this.captureMemorySnapshot();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('📊 Performance Monitor Stopped');
  }

  captureMemorySnapshot() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000 / 60); // minutes

    // Note: React Native doesn't expose memory API like web
    // But we can track our own metrics
    const snapshot = {
      uptime: `${uptime} min`,
      timestamp: new Date().toLocaleTimeString(),
      // Add custom metrics
    };

    this.memorySnapshots.push(snapshot);

    console.log(`📊 Memory Snapshot @ ${uptime} min:`, snapshot);

    // Alert if session is long
    if (uptime > 0 && uptime % 10 === 0) {
      console.warn(`⚠️ App running for ${uptime} minutes - performance may degrade in DEV mode`);
    }
  }

  trackComponentRender(componentName) {
    if (!__DEV__) return;

    const count = this.renderCounts.get(componentName) || 0;
    this.renderCounts.set(componentName, count + 1);

    // Warn on excessive renders
    if (count > 0 && count % 50 === 0) {
      console.warn(`⚠️ ${componentName} rendered ${count} times`);
    }
  }

  getReport() {
    console.log('📊 === Performance Report ===');
    console.log(`Uptime: ${Math.floor((Date.now() - this.startTime) / 1000 / 60)} minutes`);
    console.log('Render Counts:', Array.from(this.renderCounts.entries()));
    console.log('Memory Snapshots:', this.memorySnapshots.length);
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Auto-start in development
if (__DEV__) {
  performanceMonitor.start();

  // Report on app exit (component unmount)
  if (typeof global !== 'undefined') {
    global.performanceMonitor = performanceMonitor;
  }
}
