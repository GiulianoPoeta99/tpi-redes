"""Tests for Windows compatibility layer."""

import platform
import pytest

from tpi_redes.platform_compat import (
    get_python_path,
    is_admin,
    is_npcap_installed,
    kill_process_tree,
    setup_process_death_signal,
)


class TestPrivilegeDetection:
    """Test privilege detection across platforms."""

    def test_is_admin_returns_bool(self):
        """Test that is_admin returns a boolean value."""
        result = is_admin()
        assert isinstance(result, bool)

    @pytest.mark.skipif(
        platform.system() != "Windows", reason="Windows-specific test"
    )
    def test_is_admin_on_windows(self):
        """Test admin detection on Windows."""
        # This test will pass whether running as admin or not
        # Just verify it doesn't crash
        result = is_admin()
        assert isinstance(result, bool)

    @pytest.mark.skipif(
        platform.system() == "Windows", reason="Unix-specific test"
    )
    def test_is_admin_on_unix(self):
        """Test admin detection on Unix-like systems."""
        result = is_admin()
        # When running tests normally, should not be root
        # But don't assert the value, just that it works
        assert isinstance(result, bool)


class TestPythonPath:
    """Test Python path detection."""

    def test_get_python_path_returns_path(self):
        """Test that get_python_path returns a valid Path object."""
        from pathlib import Path

        result = get_python_path(Path(".venv"))
        assert isinstance(result, Path)

    @pytest.mark.skipif(
        platform.system() != "Windows", reason="Windows-specific test"
    )
    def test_get_python_path_windows(self):
        """Test Python path construction on Windows."""
        from pathlib import Path

        result = get_python_path(Path(".venv"))
        assert "Scripts" in str(result)
        assert "python.exe" in str(result)

    @pytest.mark.skipif(
        platform.system() == "Windows", reason="Unix-specific test"
    )
    def test_get_python_path_unix(self):
        """Test Python path construction on Unix."""
        from pathlib import Path

        result = get_python_path(Path(".venv"))
        assert "bin" in str(result)
        assert "python" in str(result)


class TestNpcapDetection:
    """Test Npcap/libpcap detection."""

    def test_is_npcap_installed_returns_bool(self):
        """Test that is_npcap_installed returns a boolean."""
        result = is_npcap_installed()
        assert isinstance(result, bool)

    @pytest.mark.skipif(
        platform.system() != "Windows", reason="Windows-specific test"
    )
    def test_npcap_detection_windows(self):
        """Test Npcap detection on Windows."""
        # Just verify it doesn't crash
        # Actual presence depends on installation
        result = is_npcap_installed()
        assert isinstance(result, bool)


class TestProcessManagement:
    """Test process management functions."""

    def test_kill_process_tree_invalid_pid(self):
        """Test that kill_process_tree handles invalid PID gracefully."""
        # Should not raise exception for invalid PID
        try:
            kill_process_tree(999999)
        except Exception as e:
            pytest.fail(f"kill_process_tree raised exception: {e}")

    def test_kill_process_tree_zero_pid(self):
        """Test that kill_process_tree handles zero PID gracefully."""
        # Should return immediately for PID 0
        try:
            kill_process_tree(0)
        except Exception as e:
            pytest.fail(f"kill_process_tree raised exception: {e}")

    def test_setup_process_death_signal(self):
        """Test that setup_process_death_signal doesn't crash."""
        # This should work on all platforms (no-op on Windows)
        try:
            setup_process_death_signal()
        except Exception as e:
            pytest.fail(f"setup_process_death_signal raised exception: {e}")


class TestCrossPlatformCompatibility:
    """Test that functions work across platforms."""

    def test_all_functions_importable(self):
        """Test that all compatibility functions can be imported."""
        from tpi_redes import platform_compat

        required_functions = [
            "is_admin",
            "elevate_privileges",
            "kill_process_tree",
            "get_python_path",
            "is_npcap_installed",
            "setup_process_death_signal",
        ]

        for func_name in required_functions:
            assert hasattr(platform_compat, func_name), f"Missing function: {func_name}"

    def test_platform_detection(self):
        """Test that platform detection works."""
        system = platform.system()
        assert system in ["Windows", "Linux", "Darwin"], f"Unknown platform: {system}"

        # Verify our functions don't crash on current platform
        is_admin()
        get_python_path(".venv")
        is_npcap_installed()
        setup_process_death_signal()
