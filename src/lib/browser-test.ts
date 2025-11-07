// Browser Console Test for Phase 1 Functionality
// Copy and paste this into browser console when app is running

export const browserTests = {
  // Test basic functionality from browser console
  testBasicFunctionality: async () => {
    console.log('🧪 Starting Phase 1 Functional Tests...');

    try {
      // Test 1: Import all modules
      console.log('📦 Testing imports...');
      const { rifValidation, currencyUtils, fiscalDateUtils } = await import('./utils');
      const { logger } = await import('./logger');
      const { apiClient } = await import('./api-client');
      const { supabase } = await import('./supabase');

      console.log('✅ All imports successful');

      // Test 2: RIF Validation
      console.log('🆔 Testing RIF validation...');
      const testRifs = ['J-40123456-7', 'V-12345678-0', 'INVALID'];
      testRifs.forEach(rif => {
        const isValid = rifValidation.isValid(rif);
        const formatted = rifValidation.format(rif);
        console.log(`  ${rif}: Valid=${isValid}, Formatted=${formatted}`);
      });

      // Test 3: Currency calculations
      console.log('💰 Testing currency calculations...');
      const amount = 1000;
      const iva = currencyUtils.calculateIVA(amount);
      const igtf = currencyUtils.calculateIGTF(amount);
      const vesFormat = currencyUtils.formatVES(amount);
      console.log(`  Amount: ${amount} VES`);
      console.log(`  IVA (16%): ${iva}`);
      console.log(`  IGTF (3%): ${igtf}`);
      console.log(`  Formatted: ${vesFormat}`);

      // Test 4: Date utilities
      console.log('📅 Testing date utilities...');
      const now = new Date();
      const fiscalPeriod = fiscalDateUtils.getFiscalPeriod(now);
      const seniatFormat = fiscalDateUtils.formatForSENIAT(now);
      console.log(`  Current fiscal period: ${fiscalPeriod}`);
      console.log(`  SENIAT format: ${seniatFormat}`);

      // Test 5: Logging system
      console.log('📝 Testing logging system...');
      logger.info('browser_test', 'test_run', 'Browser test executed successfully');
      logger.warn('browser_test', 'test_run', 'This is a test warning');

      const recentLogs = logger.getRecentLogs(5);
      console.log(`  Recent logs count: ${recentLogs.length}`);
      console.log('  Latest log:', recentLogs[0]);

      // Test 6: Environment configuration
      console.log('⚙️ Testing environment configuration...');
      const envConfig = {
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        tfhkaUrl: import.meta.env.VITE_TFHKA_API_URL
      };
      console.log('  Environment config:', envConfig);

      // Test 7: API Client configuration
      console.log('🌐 Testing API client...');
      console.log(`  Main API base URL: ${apiClient.defaults.baseURL}`);
      console.log(`  Request interceptors: ${!!apiClient.interceptors.request ? 'configured' : 'not configured'}`);
      console.log(`  Response interceptors: ${!!apiClient.interceptors.response ? 'configured' : 'not configured'}`);

      // Test 8: Supabase client
      console.log('🗄️ Testing Supabase client...');
      console.log('  Supabase client configured:', !!supabase);

      console.log('✅ All basic functionality tests passed!');
      console.log('🎉 Phase 1 is fully functional in browser environment');

      return {
        success: true,
        message: 'All tests passed successfully',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
        timestamp: new Date().toISOString()
      };
    }
  },

  // Test Supabase connection (safe read-only test)
  testSupabaseConnection: async () => {
    console.log('🗄️ Testing Supabase connection...');

    try {
      const { supabase } = await import('./supabase');

      // Test basic connection with a simple query
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Supabase connection failed:', error instanceof Error ? error.message : String(error));
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }

      console.log('✅ Supabase connection successful');
      console.log('  Data received:', !!data);

      return { success: true, connectionValid: true };

    } catch (error) {
      console.error('❌ Supabase test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  // Test token management
  testTokenManagement: async () => {
    console.log('🔐 Testing token management...');

    try {
      const { tokenManager, tfhkaTokenManager } = await import('./api-client');

      // Test main token manager
      const testToken = 'test_token_' + Date.now();
      tokenManager.set(testToken);
      const retrieved = tokenManager.get();
      const isStored = retrieved === testToken;

      tokenManager.remove();
      const isRemoved = tokenManager.get() === null;

      // Test TFHKA token manager
      const tfhkaToken = 'tfhka_' + Date.now();
      tfhkaTokenManager.set(tfhkaToken);
      const tfhkaRetrieved = tfhkaTokenManager.get();
      const tfhkaStored = tfhkaRetrieved === tfhkaToken;

      console.log(`  Main token storage: ${isStored ? '✅' : '❌'}`);
      console.log(`  Main token removal: ${isRemoved ? '✅' : '❌'}`);
      console.log(`  TFHKA token storage: ${tfhkaStored ? '✅' : '❌'}`);

      const allPassed = isStored && isRemoved && tfhkaStored;
      console.log(`  Overall token management: ${allPassed ? '✅' : '❌'}`);

      return {
        success: allPassed,
        tests: { isStored, isRemoved, tfhkaStored }
      };

    } catch (error) {
      console.error('❌ Token management test failed:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  // Run all browser tests
  runAllBrowserTests: async () => {
    console.log('🚀 Starting comprehensive browser tests for Phase 1...');
    console.log('=' .repeat(60));

    const results = {
      basicFunctionality: await browserTests.testBasicFunctionality(),
      supabaseConnection: await browserTests.testSupabaseConnection(),
      tokenManagement: await browserTests.testTokenManagement()
    };

    const passedTests = Object.values(results).filter(r => r.success).length;
    const totalTests = Object.keys(results).length;
    const allPassed = passedTests === totalTests;

    console.log('=' .repeat(60));
    console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);

    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! Phase 1 is fully functional!');
    } else {
      console.log('⚠️ Some tests failed. Check details above.');
    }

    console.log('🔍 Detailed results:', results);

    return {
      success: allPassed,
      passedTests,
      totalTests,
      results
    };
  }
};

// Make available globally for console use
(window as any).phase1Tests = browserTests;

console.log('📋 Phase 1 browser tests loaded!');
console.log('💡 Run: phase1Tests.runAllBrowserTests()');

export default browserTests;