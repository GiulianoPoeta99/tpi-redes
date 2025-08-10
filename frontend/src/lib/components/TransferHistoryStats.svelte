<script lang="ts">
  import { historyStats } from '../stores/history';
  import { TransferUtils } from '../types';

  function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }
</script>

<div class="history-stats">
  <div class="stats-header">
    <h6>Statistics</h6>
  </div>
  
  <div class="stats-grid">
    <!-- Transfer Counts -->
    <div class="stat-card">
      <div class="stat-icon">📊</div>
      <div class="stat-content">
        <div class="stat-value">{$historyStats.totalTransfers}</div>
        <div class="stat-label">Total Transfers</div>
      </div>
    </div>

    <div class="stat-card success">
      <div class="stat-icon">✅</div>
      <div class="stat-content">
        <div class="stat-value">{$historyStats.completedTransfers}</div>
        <div class="stat-label">Completed</div>
      </div>
    </div>

    <div class="stat-card error">
      <div class="stat-icon">❌</div>
      <div class="stat-content">
        <div class="stat-value">{$historyStats.failedTransfers}</div>
        <div class="stat-label">Failed</div>
      </div>
    </div>

    <div class="stat-card warning">
      <div class="stat-icon">⏹️</div>
      <div class="stat-content">
        <div class="stat-value">{$historyStats.cancelledTransfers}</div>
        <div class="stat-label">Cancelled</div>
      </div>
    </div>

    <!-- Success Rate -->
    <div class="stat-card">
      <div class="stat-icon">📈</div>
      <div class="stat-content">
        <div class="stat-value">{formatPercentage($historyStats.successRate)}</div>
        <div class="stat-label">Success Rate</div>
      </div>
    </div>

    <!-- Data Volume -->
    <div class="stat-card">
      <div class="stat-icon">💾</div>
      <div class="stat-content">
        <div class="stat-value">{TransferUtils.formatBytes($historyStats.totalBytes)}</div>
        <div class="stat-label">Total Data</div>
      </div>
    </div>

    <!-- Average Speed -->
    <div class="stat-card">
      <div class="stat-icon">⚡</div>
      <div class="stat-content">
        <div class="stat-value">{TransferUtils.formatSpeed($historyStats.averageSpeed)}</div>
        <div class="stat-label">Avg Speed</div>
      </div>
    </div>

    <!-- Total Duration -->
    <div class="stat-card">
      <div class="stat-icon">⏱️</div>
      <div class="stat-content">
        <div class="stat-value">{TransferUtils.formatDuration($historyStats.totalDuration)}</div>
        <div class="stat-label">Total Time</div>
      </div>
    </div>
  </div>

  <!-- Protocol and Mode Breakdown -->
  <div class="breakdown-section">
    <div class="breakdown-group">
      <h6>By Protocol</h6>
      <div class="breakdown-stats">
        <div class="breakdown-item">
          <span class="protocol-badge protocol-tcp">TCP</span>
          <span class="breakdown-value">{$historyStats.protocolStats.tcp}</span>
        </div>
        <div class="breakdown-item">
          <span class="protocol-badge protocol-udp">UDP</span>
          <span class="breakdown-value">{$historyStats.protocolStats.udp}</span>
        </div>
      </div>
    </div>

    <div class="breakdown-group">
      <h6>By Mode</h6>
      <div class="breakdown-stats">
        <div class="breakdown-item">
          <span class="mode-badge">📤 Sent</span>
          <span class="breakdown-value">{$historyStats.modeStats.sent}</span>
        </div>
        <div class="breakdown-item">
          <span class="mode-badge">📥 Received</span>
          <span class="breakdown-value">{$historyStats.modeStats.received}</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .history-stats {
    padding: 1rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
  }

  .stats-header {
    margin-bottom: 1rem;
  }

  .stats-header h6 {
    margin: 0;
    color: #495057;
    font-weight: 600;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border-left: 4px solid #6c757d;
  }

  .stat-card.success {
    border-left-color: #28a745;
  }

  .stat-card.error {
    border-left-color: #dc3545;
  }

  .stat-card.warning {
    border-left-color: #ffc107;
  }

  .stat-icon {
    font-size: 1.5rem;
    opacity: 0.8;
  }

  .stat-content {
    flex: 1;
    min-width: 0;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: #495057;
    line-height: 1;
  }

  .stat-label {
    font-size: 0.8rem;
    color: #6c757d;
    margin-top: 0.25rem;
  }

  .breakdown-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .breakdown-group h6 {
    margin: 0 0 0.75rem 0;
    color: #495057;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .breakdown-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .breakdown-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .breakdown-value {
    font-weight: 600;
    color: #495057;
  }

  .protocol-badge,
  .mode-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .protocol-badge {
    background: #e3f2fd;
    color: #1976d2;
  }

  .protocol-badge.protocol-tcp {
    background: #e8f5e8;
    color: #2e7d32;
  }

  .protocol-badge.protocol-udp {
    background: #fff3e0;
    color: #f57c00;
  }

  .mode-badge {
    background: #f3e5f5;
    color: #7b1fa2;
    font-size: 0.8rem;
  }

  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    }
    
    .stat-card {
      padding: 0.75rem;
      gap: 0.5rem;
    }
    
    .stat-icon {
      font-size: 1.25rem;
    }
    
    .stat-value {
      font-size: 1rem;
    }
    
    .breakdown-section {
      grid-template-columns: 1fr;
    }
  }
</style>