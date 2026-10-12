from pathlib import Path
import re
import yaml

def test_sample_bundle_frontmatter_links_and_privacy():
    root=Path(__file__).resolve().parents[3]/"knowledge"/"okf"
    files=list(root.rglob("*.md"))
    assert len(files)>=4
    for path in files:
        content=path.read_text()
        if path.name=="index.md":
            if path.parent==root: assert yaml.safe_load(content.split("---")[1])["okf_version"]=="0.2"
            continue
        front=yaml.safe_load(content.split("---")[1])
        assert front["type"]
        assert "verified" not in front
        assert front["generated"]["by"]
        assert "user_id" not in front and "session_id" not in front
        for target in re.findall(r"\]\((/[^)]+)\)",content):
            assert (root/target.lstrip("/")).is_file()
