import redis
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
import json
import uuid

class SemanticGraphCache:
    def __init__(self):
        # Simplified Redis connection
        self.redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
        
        # Initialize sentence transformer for embedding queries
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Similarity threshold for retrieving cached results
        self.similarity_threshold = 0.8
    
    def _generate_unique_id(self) -> str:
        """Generate a unique identifier for cache entries."""
        return str(uuid.uuid4())
    
    def _compute_embedding(self, query: str) -> np.ndarray:
        """Convert query to semantic embedding."""
        return self.embedder.encode(query)
    
    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute cosine similarity between two vectors."""
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
    
    def cache_query_response(self, query: str, response: Dict[str, Any]) -> str:
        """
        Cache a query and its corresponding response in a graph-like structure.
        
        Args:
            query (str): The original query
            response (dict): The response to be cached
        
        Returns:
            str: Unique identifier for the cached entry
        """
        # Generate unique ID for this cache entry
        cache_id = self._generate_unique_id()
        
        # Compute semantic embedding of the query
        query_embedding = self._compute_embedding(query)
        
        # Convert embedding to list and ensure string representation for Redis
        embedding_list = query_embedding.tolist()
        
        # Prepare cache entry with type-safe conversions
        cache_entry = {
            'id': str(cache_id),
            'query': str(query),
            'embedding': json.dumps(embedding_list),  # Ensures string representation
            'response': json.dumps(response),  # Ensures string representation
            'timestamp': str(int(self.redis_client.time()[0]))  # Ensure string
        }
        
        # Store in Redis hash
        redis_key = f"semantic_cache:{cache_id}"
        self.redis_client.hset(redis_key, cache_entry)
        
        # Add to a sorted set for easy retrieval and management
        # Use numeric score for sorting
        self.redis_client.zadd('semantic_cache_index', {cache_id: float(cache_entry['timestamp'])})
        
        return cache_id
    
    def retrieve_similar_response(self, query: str, top_k: int = 1) -> List[Dict[str, Any]]:
        """
        Retrieve similar cached responses based on semantic similarity.
        
        Args:
            query (str): The input query to find similar cached responses
            top_k (int): Number of similar responses to retrieve
        
        Returns:
            List of similar cached responses
        """
        # Compute query embedding
        query_embedding = self._compute_embedding(query)
        
        # Retrieve all cache entries
        cache_keys = self.redis_client.zrange('semantic_cache_index', 0, -1)
        
        similar_responses = []
        
        for key in cache_keys:
            # Retrieve cache entry details
            cache_entry = self.redis_client.hgetall(f"semantic_cache:{key}")
            
            if cache_entry:
                # Safely parse embedding and handle potential errors
                try:
                    # Convert string embedding back to numpy array
                    cached_embedding = np.array(json.loads(cache_entry['embedding']))
                    
                    # Compute similarity
                    similarity = self._cosine_similarity(query_embedding, cached_embedding)
                    
                    # Check if similar enough
                    if similarity >= self.similarity_threshold:
                        similar_responses.append({
                            'similarity': float(similarity),
                            'query': cache_entry['query'],
                            'response': json.loads(cache_entry['response'])
                        })
                except (KeyError, json.JSONDecodeError) as e:
                    print(f"Error processing cache entry: {e}")
                    continue
        
        # Sort by similarity and return top_k
        return sorted(similar_responses, key=lambda x: x['similarity'], reverse=True)[:top_k]
    
    def clear_old_cache(self, max_age_seconds: int = 86400):
        """
        Remove cache entries older than specified time.
        
        Args:
            max_age_seconds (int): Maximum age of cache entries in seconds
        """
        current_time = int(self.redis_client.time()[0])
        cache_keys = self.redis_client.zrange('semantic_cache_index', 0, -1)
        
        for key in cache_keys:
            cache_entry = self.redis_client.hgetall(f"semantic_cache:{key}")
            
            if cache_entry:
                # Safely convert timestamp
                entry_time = int(cache_entry.get('timestamp', 0))
                if current_time - entry_time > max_age_seconds:
                    # Remove from index and delete hash
                    self.redis_client.zrem('semantic_cache_index', key)
                    self.redis_client.delete(f"semantic_cache:{key}")

# Example Usage
def main():
    # Initialize semantic graph cache
    graph_cache = SemanticGraphCache()
    
    # Example query and response
    query1 = "Tell me about machine learning"
    response1 = {
        "summary": "Machine learning is a subset of AI...",
        "detailed_explanation": "...",
        "related_topics": ["AI", "Data Science"]
    }
    
    # Cache the first query
    cache_id1 = graph_cache.cache_query_response(query1, response1)
    
    # Similar query to test retrieval
    similar_query = "Explain machine learning concepts"
    similar_results = graph_cache.retrieve_similar_response(similar_query)
    
    print("Similar Cached Responses:", similar_results)
    
    # Clear old cache entries
    graph_cache.clear_old_cache()

if __name__ == "__main__":
    main()
# import os
# from dotenv import load_dotenv
# import redis
# import numpy as np
# from sentence_transformers import SentenceTransformer
# from typing import List, Dict, Any
# import json
# import uuid

# # Load environment variables
# load_dotenv()

# class SemanticGraphCache:
#     def __init__(
#         self, 
#         redis_host=None, 
#         redis_port=None, 
#         redis_password=None,
#         redis_db=0
#     ):
#         # Prioritize environment variables over direct parameters
#         self.redis_host = redis_host or os.getenv('REDIS_HOST', 'localhost')
#         self.redis_port = redis_port or int(os.getenv('REDIS_PORT', 6379))
#         self.redis_password = redis_password or os.getenv('REDIS_PASSWORD')
        
#         # Secure Redis connection with optional authentication
#         try:
#             # self.redis_client = redis.Redis(
#             #     host=self.redis_host, 
#             #     port=self.redis_port, 
#             #     password=self.redis_password,  # None if no password
#             #     db=redis_db,
#             #     ssl=os.getenv('REDIS_SSL', 'false').lower() == 'true',
#             #     ssl_cert_reqs=None  # Be cautious in production
#             # )
#             self.redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
            
#             # Test connection
#             self.redis_client.ping()
#         except redis.AuthenticationError:
#             raise ValueError("Redis authentication failed. Check your credentials.")
#         except redis.ConnectionError:
#             raise ConnectionError(f"Unable to connect to Redis at {self.redis_host}:{self.redis_port}")
        
#         # Optional: Secure embedder API key
#         huggingface_token = os.getenv('HUGGINGFACE_TOKEN')
        
#         # Initialize sentence transformer with optional token
#         if huggingface_token:
#             self.embedder = SentenceTransformer(
#                 'all-MiniLM-L6-v2', 
#                 token=huggingface_token
#             )
#         else:
#             self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        
#         # Configurable parameters from environment
#         self.similarity_threshold = float(os.getenv('SIMILARITY_THRESHOLD', 0.8))
#         self.cache_expiry = int(os.getenv('CACHE_EXPIRY_SECONDS', 86400))
    
#     # ... [rest of the previous implementation remains the same]

#     def get_redis_connection_info(self):
#         """
#         Retrieve Redis connection information securely.
#         Useful for logging and monitoring.
#         """
#         return {
#             'host': self.redis_host,
#             'port': self.redis_port,
#             'db': self.redis_client.db,
#             'ssl': os.getenv('REDIS_SSL', 'false')
#         }

# # Sample .env file contents
# """
# # Redis Configuration
# REDIS_HOST=your-redis-host.com
# REDIS_PORT=6379
# REDIS_PASSWORD=your_secure_redis_password
# REDIS_SSL=true

# # Optional Hugging Face Token for Embeddings
# HUGGINGFACE_TOKEN=your_huggingface_token

# # Caching Parameters
# SIMILARITY_THRESHOLD=0.85
# CACHE_EXPIRY_SECONDS=172800  # 2 days
# """

# def main():
#     # The main function remains mostly the same
#     # But now supports environment-based configuration
#     try:
#         graph_cache = SemanticGraphCache()
        
#         # Connection info can be logged for monitoring
#         print("Redis Connection:", graph_cache.get_redis_connection_info())
        
#         # Rest of the previous implementation...
#     except Exception as e:
#         print(f"Initialization Error: {e}")

# if __name__ == "__main__":
#     main()