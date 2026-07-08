import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import _normalize_session_id


def test_normalize_session_id_keeps_existing_value():
    assert _normalize_session_id("abc123") == "abc123"


def test_normalize_session_id_generates_value_when_missing():
    session_id = _normalize_session_id(None)
    assert session_id is not None
    assert len(session_id) > 0
