from aiops_ml.data.rcaeval import RCAEvalManifest, create_rcaeval_split


def test_rcaeval_split_generation():
    manifest = RCAEvalManifest()
    split = create_rcaeval_split(manifest, train_ratio=0.7, seed=42)

    assert split["dataset_name"] == "RCAEval"
    assert split["train_count"] == int(735 * 0.7)
    assert len(split["splits"]["train"]) == split["train_count"]
    # Check no overlap between train and test
    train_set = set(split["splits"]["train"])
    test_set = set(split["splits"]["test"])
    assert len(train_set.intersection(test_set)) == 0
