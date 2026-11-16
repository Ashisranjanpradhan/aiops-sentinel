import networkx as nx


class ServiceDependencyGraph:
    """Directed dependency graph representing microservice call paths and relationships."""

    def __init__(self):
        self.graph = nx.DiGraph()

    def add_service(
        self, service_id: str, service_name: str, metadata: dict | None = None
    ):
        self.graph.add_node(service_id, name=service_name, metadata=metadata or {})

    def add_edge(
        self,
        source_id: str,
        target_id: str,
        weight: float = 1.0,
        error_rate: float = 0.0,
        relationship: str = "calls",
        provenance: str = "trace-derived",
    ):
        self.graph.add_edge(
            source_id,
            target_id,
            weight=weight,
            error_rate=error_rate,
            relationship=relationship,
            provenance=provenance,
        )

    def get_upstream_services(self, service_id: str) -> list[str]:
        """Services that call this service."""
        if service_id not in self.graph:
            return []
        return list(self.graph.predecessors(service_id))

    def get_downstream_services(self, service_id: str) -> list[str]:
        """Services called by this service."""
        if service_id not in self.graph:
            return []
        return list(self.graph.successors(service_id))

    def shortest_path_distance(self, source_id: str, target_id: str) -> int | None:
        if source_id not in self.graph or target_id not in self.graph:
            return None
        try:
            return nx.shortest_path_length(
                self.graph, source=source_id, target=target_id
            )
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

    def get_connected_subgraph(self, service_ids: list[str]) -> nx.DiGraph:
        all_nodes: set[str] = set(service_ids)
        for s in service_ids:
            all_nodes.update(self.get_upstream_services(s))
            all_nodes.update(self.get_downstream_services(s))
        return self.graph.subgraph(all_nodes)
