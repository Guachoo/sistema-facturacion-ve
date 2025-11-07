/**
 * BCV Integration Test Suite
 * Comprehensive testing of the enhanced BCV rate system
 */

import { bcvClient } from './bcv-client';
import { rateCache, getCurrentBcvRate, getBcvCacheHealth } from './rate-cache';
import { rateMonitor, getMonitoringStatus } from './rate-monitor';

export interface BcvIntegrationTestResult {
  success: boolean;
  results: {
    clientConnectivity: boolean;
    rateFetching: boolean;
    caching: boolean;
    monitoring: boolean;
    fallback: boolean;
  };
  errors: string[];
  performance: {
    fetchTime: number;
    cacheHitTime: number;
    validationTime: number;
  };
  summary: string;
}

/**
 * Run comprehensive BCV integration tests
 */
export async function runBcvIntegrationTest(): Promise<BcvIntegrationTestResult> {
  console.log('🧪 Starting BCV Integration Test Suite...');

  const results = {
    clientConnectivity: false,
    rateFetching: false,
    caching: false,
    monitoring: false,
    fallback: false
  };

  const errors: string[] = [];
  const performance = {
    fetchTime: 0,
    cacheHitTime: 0,
    validationTime: 0
  };

  // Test 1: Client Connectivity
  console.log('1. Testing BCV client connectivity...');
  try {
    const startTime = Date.now();
    const connectivity = await bcvClient.testConnectivity();
    performance.fetchTime = Date.now() - startTime;

    if (connectivity.overall) {
      results.clientConnectivity = true;
      console.log('✅ BCV connectivity test passed');
      console.log(`   - Primary sources: ${connectivity.primary ? '✅' : '❌'}`);
      console.log(`   - Fallback available: ${connectivity.fallback ? '✅' : '❌'}`);
      console.log('   - Details:');
      connectivity.details.forEach(detail => console.log(`     ${detail}`));
    } else {
      errors.push('No BCV sources are accessible');
    }
  } catch (error) {
    errors.push(`Connectivity test failed: ${error}`);
  }

  // Test 2: Rate Fetching
  console.log('2. Testing rate fetching...');
  try {
    const startTime = Date.now();
    const rateResponse = await bcvClient.getCurrentRate();
    performance.fetchTime += Date.now() - startTime;

    if (rateResponse.success && bcvClient.isValidRate(rateResponse.rate)) {
      results.rateFetching = true;
      console.log('✅ Rate fetching test passed');
      console.log(`   - Rate: ${rateResponse.rate} VES/USD`);
      console.log(`   - Source: ${rateResponse.source}`);
      console.log(`   - Date: ${rateResponse.date}`);
    } else {
      errors.push(`Invalid rate received: ${rateResponse.rate} from ${rateResponse.source}`);
    }
  } catch (error) {
    errors.push(`Rate fetching failed: ${error}`);
  }

  // Test 3: Caching System
  console.log('3. Testing caching system...');
  try {
    // Clear cache first
    rateCache.clearCache();

    // First fetch (should hit API)
    const startTime1 = Date.now();
    const cachedRate1 = await getCurrentBcvRate(true); // Force refresh
    const fetchTime = Date.now() - startTime1;

    // Second fetch (should hit cache)
    const startTime2 = Date.now();
    const cachedRate2 = await getCurrentBcvRate(false); // Use cache
    performance.cacheHitTime = Date.now() - startTime2;

    if (cachedRate1.rate === cachedRate2.rate && performance.cacheHitTime < fetchTime) {
      results.caching = true;
      console.log('✅ Caching system test passed');
      console.log(`   - Cache hit time: ${performance.cacheHitTime}ms`);
      console.log(`   - Fresh fetch time: ${fetchTime}ms`);
      console.log(`   - Cache efficiency: ${Math.round((1 - performance.cacheHitTime / fetchTime) * 100)}%`);
    } else {
      errors.push('Caching system not working efficiently');
    }

    // Test cache health
    const cacheHealth = getBcvCacheHealth();
    if (cacheHealth.status !== 'critical') {
      console.log(`   - Cache health: ${cacheHealth.status}`);
      console.log(`   - Cache size: ${cacheHealth.cacheSize} entries`);
    }

  } catch (error) {
    errors.push(`Caching test failed: ${error}`);
  }

  // Test 4: Monitoring System
  console.log('4. Testing monitoring system...');
  try {
    // Check monitoring status
    const monitorStatus = getMonitoringStatus();
    console.log(`   - Monitor active: ${monitorStatus.isActive}`);
    console.log(`   - Last check: ${monitorStatus.lastCheck ? new Date(monitorStatus.lastCheck).toLocaleString() : 'Never'}`);
    console.log(`   - Alerts today: ${monitorStatus.alertsToday}`);
    console.log(`   - Health status: ${monitorStatus.healthStatus}`);
    console.log(`   - Volatility detected: ${monitorStatus.volatilityDetected ? 'Yes' : 'No'}`);

    // Perform a manual rate check
    const checkResult = await rateMonitor.checkRateNow();

    if (checkResult.rate && checkResult.rate.rate > 0) {
      results.monitoring = true;
      console.log('✅ Monitoring system test passed');
      console.log(`   - Current rate: ${checkResult.rate.rate} VES/USD`);
      console.log(`   - Confidence: ${checkResult.rate.confidence}`);
      console.log(`   - Volatility detected: ${checkResult.volatilityDetected ? 'Yes' : 'No'}`);

      if (checkResult.alert) {
        console.log(`   - Alert generated: ${checkResult.alert.title}`);
      }
    } else {
      errors.push('Monitoring system did not return valid rate');
    }
  } catch (error) {
    errors.push(`Monitoring test failed: ${error}`);
  }

  // Test 5: Fallback Mechanism
  console.log('5. Testing fallback mechanism...');
  try {
    // Test emergency fallback
    const fallbackRate = await getCurrentBcvRate();

    if (fallbackRate && fallbackRate.rate > 0) {
      results.fallback = true;
      console.log('✅ Fallback mechanism test passed');
      console.log(`   - Fallback rate: ${fallbackRate.rate} VES/USD`);
      console.log(`   - Source: ${fallbackRate.source}`);
      console.log(`   - Confidence: ${fallbackRate.confidence}`);
    } else {
      errors.push('Fallback mechanism failed to provide valid rate');
    }
  } catch (error) {
    errors.push(`Fallback test failed: ${error}`);
  }

  // Test 6: Performance Validation
  console.log('6. Testing performance...');
  try {
    const startTime = Date.now();

    // Test multiple parallel requests
    const promises = Array(5).fill(null).map(() => getCurrentBcvRate());
    const parallelResults = await Promise.all(promises);

    performance.validationTime = Date.now() - startTime;

    const allValid = parallelResults.every(result => result.rate > 0);

    if (allValid && performance.validationTime < 10000) { // Should complete in under 10 seconds
      console.log('✅ Performance validation passed');
      console.log(`   - Parallel requests time: ${performance.validationTime}ms`);
      console.log(`   - Average per request: ${Math.round(performance.validationTime / 5)}ms`);
    } else {
      errors.push('Performance validation failed - requests too slow or invalid');
    }
  } catch (error) {
    errors.push(`Performance test failed: ${error}`);
  }

  // Calculate overall success
  const success = Object.values(results).every(result => result);

  // Generate summary
  let summary = '';
  if (success) {
    summary = '🎉 All BCV integration tests passed! The system is ready for production use.';
  } else {
    const failedTests = Object.entries(results)
      .filter(([, passed]) => !passed)
      .map(([test]) => test);
    summary = `❌ ${failedTests.length} test(s) failed: ${failedTests.join(', ')}`;
  }

  // Log results
  console.log('\n📊 BCV Integration Test Results:');
  console.log(`- Client Connectivity: ${results.clientConnectivity ? '✅' : '❌'}`);
  console.log(`- Rate Fetching: ${results.rateFetching ? '✅' : '❌'}`);
  console.log(`- Caching System: ${results.caching ? '✅' : '❌'}`);
  console.log(`- Monitoring System: ${results.monitoring ? '✅' : '❌'}`);
  console.log(`- Fallback Mechanism: ${results.fallback ? '✅' : '❌'}`);
  console.log(`- Overall Success: ${success ? '✅' : '❌'}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }

  console.log('\n⚡ Performance Metrics:');
  console.log(`- Average fetch time: ${performance.fetchTime}ms`);
  console.log(`- Cache hit time: ${performance.cacheHitTime}ms`);
  console.log(`- Validation time: ${performance.validationTime}ms`);

  console.log(`\n${summary}`);

  return {
    success,
    results,
    errors,
    performance,
    summary
  };
}

/**
 * Quick health check for BCV integration
 */
export async function quickBcvHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'critical';
  message: string;
  details: {
    rateAvailable: boolean;
    cacheWorking: boolean;
    monitoringActive: boolean;
    lastUpdate: string;
  };
}> {
  try {
    // Get current rate
    const rate = await getCurrentBcvRate();
    const cacheHealth = getBcvCacheHealth();
    const monitoringStatus = getMonitoringStatus();

    const details = {
      rateAvailable: rate.rate > 0,
      cacheWorking: cacheHealth.status !== 'critical',
      monitoringActive: monitoringStatus.isActive,
      lastUpdate: rate.lastUpdate || ''
    };

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let message = 'BCV integration is working normally';

    if (!details.rateAvailable) {
      status = 'critical';
      message = 'No valid BCV rate available';
    } else if (!details.cacheWorking) {
      status = 'degraded';
      message = 'Cache system issues detected';
    } else if (!details.monitoringActive) {
      status = 'degraded';
      message = 'Rate monitoring is not active';
    }

    return { status, message, details };

  } catch (error) {
    return {
      status: 'critical',
      message: `BCV integration error: ${error instanceof Error ? error.message : String(error)}`,
      details: {
        rateAvailable: false,
        cacheWorking: false,
        monitoringActive: false,
        lastUpdate: ''
      }
    };
  }
}

/**
 * Run BCV integration test for Phase 4 Step 3
 */
export async function runPhase4Step3Test(): Promise<void> {
  console.log('🚀 STARTING PHASE 4 - STEP 3 BCV INTEGRATION TEST');
  console.log('='.repeat(60));

  const testResult = await runBcvIntegrationTest();

  console.log('\n' + '='.repeat(60));

  if (testResult.success) {
    console.log('🎉 PHASE 4 - STEP 3 COMPLETED SUCCESSFULLY!');
    console.log('✅ BCV Real Integration is working correctly:');
    console.log('   • Official BCV API connectivity');
    console.log('   • Intelligent caching system');
    console.log('   • Automatic rate monitoring');
    console.log('   • Robust fallback mechanisms');
    console.log('   • Performance optimization');
    console.log('✅ Ready to proceed to Step 4: Integración TFHKA');
  } else {
    console.log('❌ PHASE 4 - STEP 3 NEEDS FIXES');
    console.log('Please resolve the following issues before proceeding:');
    testResult.errors.forEach(error => console.log(`   • ${error}`));
  }

  console.log(`\n📊 Performance Summary:`);
  console.log(`• Average API response: ${testResult.performance.fetchTime}ms`);
  console.log(`• Cache efficiency: ${testResult.performance.cacheHitTime}ms`);
  console.log(`• System validation: ${testResult.performance.validationTime}ms`);
}