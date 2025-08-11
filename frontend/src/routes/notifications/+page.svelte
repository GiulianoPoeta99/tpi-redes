<script lang="ts">
  import { onMount } from 'svelte';
  import { systemNotifications } from '$lib/services/system-notifications';
  import NotificationSettings from '$lib/components/NotificationSettings.svelte';

  let permissionStatus = 'unknown';
  let isSupported = false;

  onMount(() => {
    isSupported = systemNotifications.supported;
    permissionStatus = systemNotifications.permission;
  });

  async function testSystemNotification() {
    try {
      await systemNotifications.show({
        title: 'Test Notification',
        body: 'This is a test system notification from the File Transfer App',
        icon: 'info'
      });
    } catch (error) {
      console.error('Failed to show test notification:', error);
    }
  }

  async function testTransferComplete() {
    try {
      await systemNotifications.showTransferComplete('test-file.txt', 1024 * 1024, 30);
    } catch (error) {
      console.error('Failed to show transfer complete notification:', error);
    }
  }

  async function testTransferError() {
    try {
      await systemNotifications.showTransferError('test-file.txt', 'Network connection failed');
    } catch (error) {
      console.error('Failed to show transfer error notification:', error);
    }
  }

  async function testConnectionStatus() {
    try {
      await systemNotifications.showConnectionStatus('connected', '192.168.1.100:8080', 'TCP');
    } catch (error) {
      console.error('Failed to show connection status notification:', error);
    }
  }
</script>

<div class="container mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6">Notification System Test</h1>
  
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Test Controls -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">Test Notifications</h2>
      
      <div class="space-y-4">
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <div>
            <p class="font-medium">System Support</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {isSupported ? 'Supported' : 'Not supported'}
            </p>
          </div>
        </div>
        
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <div>
            <p class="font-medium">Permission Status</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">{permissionStatus}</p>
          </div>
        </div>
        
        <div class="space-y-2">
          <button 
            class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            on:click={testSystemNotification}
          >
            Test Basic Notification
          </button>
          
          <button 
            class="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            on:click={testTransferComplete}
          >
            Test Transfer Complete
          </button>
          
          <button 
            class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            on:click={testTransferError}
          >
            Test Transfer Error
          </button>
          
          <button 
            class="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
            on:click={testConnectionStatus}
          >
            Test Connection Status
          </button>
        </div>
      </div>
    </div>
    
    <!-- Settings -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">Notification Settings</h2>
      <NotificationSettings showAdvanced={true} />
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 1200px;
  }
</style>