// End-to-End Test Suite Runner
// Comprehensive integration testing for the file transfer application

mod e2e;

use e2e::{TestSuiteRunner, TestResult};

/// Main E2E test suite entry point
#[tokio::test]
async fn run_complete_e2e_suite() {
    println!("🚀 Starting comprehensive E2E test suite...");
    
    let mut runner = TestSuiteRunner::new();
    
    // Run all test categories
    run_workflow_tests(&mut runner).await;
    run_cross_platform_tests(&mut runner).await;
    run_performance_tests(&mut runner).await;
    run_stress_tests(&mut runner).await;
    run_network_simulation_tests(&mut runner).await;
    run_security_tests(&mut runner).await;
    
    // Print comprehensive summary
    runner.print_summary();
    
    // Fail the test if too many individual tests failed
    let total_tests = runner.results.len();
    let passed_tests = runner.results.iter().filter(|r| r.success).count();
    let success_rate = (passed_tests as f64 / total_tests as f64) * 100.0;
    
    assert!(
        success_rate >= 75.0,
        "E2E test suite failed: only {:.1}% of tests passed (minimum 75% required)",
        success_rate
    );
    
    println!("✅ E2E test suite completed successfully!");
}

/// Run workflow tests
async fn run_workflow_tests(runner: &mut TestSuiteRunner) {
    println!("\n📋 Running workflow tests...");
    
    // Basic workflow tests
    runner.add_result(e2e::workflows::test_tcp_complete_workflow().await);
    runner.add_result(e2e::workflows::test_udp_complete_workflow().await);
    
    // Multiple file size tests
    let file_size_results = e2e::workflows::test_multiple_file_sizes().await;
    for result in file_size_results {
        runner.add_result(result);
    }
    
    // Error scenario tests
    let error_results = e2e::workflows::test_error_scenarios().await;
    for result in error_results {
        runner.add_result(result);
    }
    
    println!("✅ Workflow tests completed");
}

/// Run cross-platform tests
async fn run_cross_platform_tests(runner: &mut TestSuiteRunner) {
    println!("\n🖥️  Running cross-platform tests...");
    
    // File system tests
    let fs_results = e2e::cross_platform::test_platform_file_system().await;
    for result in fs_results {
        runner.add_result(result);
    }
    
    // Networking tests
    let network_results = e2e::cross_platform::test_platform_networking().await;
    for result in network_results {
        runner.add_result(result);
    }
    
    // Transfer behavior tests
    let transfer_results = e2e::cross_platform::test_platform_transfer_behavior().await;
    for result in transfer_results {
        runner.add_result(result);
    }
    
    println!("✅ Cross-platform tests completed");
}

/// Run performance tests
async fn run_performance_tests(runner: &mut TestSuiteRunner) {
    println!("\n⚡ Running performance tests...");
    
    let performance_results = e2e::performance::run_performance_suite().await;
    for result in performance_results {
        runner.add_result(result);
    }
    
    println!("✅ Performance tests completed");
}

/// Run stress tests
async fn run_stress_tests(runner: &mut TestSuiteRunner) {
    println!("\n💪 Running stress tests...");
    
    let stress_results = e2e::stress::run_stress_suite().await;
    for result in stress_results {
        runner.add_result(result);
    }
    
    println!("✅ Stress tests completed");
}

/// Run network simulation tests
async fn run_network_simulation_tests(runner: &mut TestSuiteRunner) {
    println!("\n🌐 Running network simulation tests...");
    
    let network_sim_results = e2e::network_sim::run_network_simulation_suite().await;
    for result in network_sim_results {
        runner.add_result(result);
    }
    
    println!("✅ Network simulation tests completed");
}

/// Run security tests
async fn run_security_tests(runner: &mut TestSuiteRunner) {
    println!("\n🔒 Running security tests...");
    
    let security_results = e2e::security::run_security_suite().await;
    for result in security_results {
        runner.add_result(result);
    }
    
    println!("✅ Security tests completed");
}

// Individual test category runners for selective testing

#[tokio::test]
async fn test_workflows_only() {
    let mut runner = TestSuiteRunner::new();
    run_workflow_tests(&mut runner).await;
    runner.print_summary();
    
    let success_rate = (runner.results.iter().filter(|r| r.success).count() as f64 / runner.results.len() as f64) * 100.0;
    assert!(success_rate >= 80.0, "Workflow tests failed: {:.1}% success rate", success_rate);
}

#[tokio::test]
async fn test_cross_platform_only() {
    let mut runner = TestSuiteRunner::new();
    run_cross_platform_tests(&mut runner).await;
    runner.print_summary();
    
    let success_rate = (runner.results.iter().filter(|r| r.success).count() as f64 / runner.results.len() as f64) * 100.0;
    assert!(success_rate >= 70.0, "Cross-platform tests failed: {:.1}% success rate", success_rate);
}

#[tokio::test]
async fn test_performance_only() {
    let mut runner = TestSuiteRunner::new();
    run_performance_tests(&mut runner).await;
    runner.print_summary();
    
    let success_rate = (runner.results.iter().filter(|r| r.success).count() as f64 / runner.results.len() as f64) * 100.0;
    assert!(success_rate >= 60.0, "Performance tests failed: {:.1}% success rate", success_rate);
}

#[tokio::test]
async fn test_stress_only() {
    let mut runner = TestSuiteRunner::new();
    run_stress_tests(&mut runner).await;
    runner.print_summary();
    
    let success_rate = (runner.results.iter().filter(|r| r.success).count() as f64 / runner.results.len() as f64) * 100.0;
    assert!(success_rate >= 50.0, "Stress tests failed: {:.1}% success rate", success_rate);
}

#[tokio::test]
async fn test_network_simulation_only() {
    let mut runner = TestSuiteRunner::new();
    run_network_simulation_tests(&mut runner).await;
    runner.print_summary();
    
    let success_rate = (runner.results.iter().filter(|r| r.success).count() as f64 / runner.results.len() as f64) * 100.0;
    assert!(success_rate >= 60.0, "Network simulation tests failed: {:.1}% success rate", success_rate);
}

#[tokio::test]
async fn test_security_only() {
    let mut runner = TestSuiteRunner::new();
    run_security_tests(&mut runner).await;
    runner.print_summary();
    
    let success_rate = (runner.results.iter().filter(|r| r.success).count() as f64 / runner.results.len() as f64) * 100.0;
    assert!(success_rate >= 70.0, "Security tests failed: {:.1}% success rate", success_rate);
}

// Quick smoke tests for CI/CD

#[tokio::test]
async fn smoke_test_basic_functionality() {
    println!("🔥 Running smoke tests for basic functionality...");
    
    let mut runner = TestSuiteRunner::new();
    
    // Run only the most critical tests
    runner.add_result(e2e::workflows::test_tcp_complete_workflow().await);
    runner.add_result(e2e::workflows::test_udp_complete_workflow().await);
    
    // Basic security check
    let security_results = e2e::security::test_input_validation().await;
    for result in security_results.into_iter().take(2) { // Only first 2 security tests
        runner.add_result(result);
    }
    
    runner.print_summary();
    
    let success_rate = (runner.results.iter().filter(|r| r.success).count() as f64 / runner.results.len() as f64) * 100.0;
    assert!(success_rate >= 90.0, "Smoke tests failed: {:.1}% success rate", success_rate);
    
    println!("✅ Smoke tests passed!");
}

#[tokio::test]
async fn regression_test_core_features() {
    println!("🔄 Running regression tests for core features...");
    
    let mut runner = TestSuiteRunner::new();
    
    // Test core TCP functionality
    runner.add_result(e2e::workflows::test_tcp_complete_workflow().await);
    
    // Test core UDP functionality  
    runner.add_result(e2e::workflows::test_udp_complete_workflow().await);
    
    // Test error handling
    let error_results = e2e::workflows::test_error_scenarios().await;
    for result in error_results {
        runner.add_result(result);
    }
    
    // Test basic performance
    let perf_config = e2e::performance::PerformanceTestConfig {
        file_sizes: vec![1024, 10 * 1024], // Only small files
        protocols: vec![file_transfer_backend::config::Protocol::Tcp],
        iterations: 1,
        timeout_seconds: 30,
    };
    
    let perf_results = e2e::performance::test_transfer_speeds(&perf_config).await;
    for result in perf_results.into_iter().take(2) { // Only first 2 performance tests
        runner.add_result(result);
    }
    
    runner.print_summary();
    
    let success_rate = (runner.results.iter().filter(|r| r.success).count() as f64 / runner.results.len() as f64) * 100.0;
    assert!(success_rate >= 85.0, "Regression tests failed: {:.1}% success rate", success_rate);
    
    println!("✅ Regression tests passed!");
}