"""Build configured evaluators for the GraphRAG evaluation pipeline."""

from azure.ai.evaluation import (
    SimilarityEvaluator,
    RelevanceEvaluator,
    GroundednessEvaluator,
    CoherenceEvaluator,
    RetrievalEvaluator,
)


def build_evaluators(model_config, credential):
    """Return a dict of evaluators keyed by their required keyword names.

    The JSONL dataset must contain: query, response, context, ground_truth.

    Evaluator details (all scores 1-5):
      - similarity:    response vs ground_truth semantic alignment
      - relevance:     response relevance to the query
      - groundedness:  response grounded in the retrieved context
      - coherence:     overall quality / coherence of the response
      - retrieval:     how well the retrieved context supports the query
    """
    return {
        "similarity": SimilarityEvaluator(
            model_config=model_config, credential=credential
        ),
        "relevance": RelevanceEvaluator(
            model_config=model_config, credential=credential
        ),
        "groundedness": GroundednessEvaluator(
            model_config=model_config, credential=credential
        ),
        "coherence": CoherenceEvaluator(
            model_config=model_config, credential=credential
        ),
        "retrieval": RetrievalEvaluator(
            model_config=model_config, credential=credential
        ),
    }
