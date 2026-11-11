"""Small contract evaluation harness; it reports checks, not subjective quality scores."""
from app.main import EditorialRequest, demo_package, retrieve_sources

CASES = [
    EditorialRequest(title="Clothes that reward attention", dek="Craft and longevity in contemporary fashion.", brand="edit"),
    EditorialRequest(title="A house shaped by daylight", dek="Architecture, thresholds and material choices.", brand="form"),
    EditorialRequest(title="A new creative vocabulary", dek="Artists working between disciplines.", brand="edit"),
]

def main():
    passed = 0
    for index, case in enumerate(CASES, start=1):
        sources = retrieve_sources(case)
        output = demo_package(case, sources)
        checks = [
            len(output.headline_suggestions) >= 3,
            bool(output.summary),
            len(output.tags) >= 3,
            output.requires_human_approval,
            all(item.source_id in {source["id"] for source in sources} for item in output.related),
        ]
        passed += sum(checks)
        print(f"case {index}: {sum(checks)}/{len(checks)} contract checks passed")
    print(f"Total: {passed}/{len(CASES) * 5} contract checks. No factuality or editorial-quality score is inferred.")

if __name__ == "__main__":
    main()
