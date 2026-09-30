from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import pandas as pd

@dataclass
class AnalyzerResult:
    """
    Standard output data container for any Game Design Analyzer.
    """
    sheet_name: str
    display_title: str
    headers: List[str]
    rows: List[List[Any]]
    column_widths: Optional[Dict[int, int]] = None
    summary_metrics: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dataframe(self) -> pd.DataFrame:
        """Converts rows and headers to pandas DataFrame."""
        if not self.rows:
            return pd.DataFrame(columns=self.headers)
        return pd.DataFrame(self.rows, columns=self.headers)


class BaseGameAnalyzer(ABC):
    """
    Abstract Interface for Game Design Analyzers (Interface Segregation & DIP).
    Each analyzer specializes in one distinct aspect of game design deconstruction (SRP).
    """

    @abstractmethod
    def get_sheet_name(self) -> str:
        """Name of the tab in Google Sheet / Excel."""
        pass

    @abstractmethod
    def get_display_title(self) -> str:
        """User-friendly title for the analysis view."""
        pass

    @abstractmethod
    def analyze(self, vp: Any, levels_data: List[Dict[str, Any]], profile: Optional[Any] = None) -> AnalyzerResult:
        """
        Executes analysis on the video processor and scanned level data.
        Returns a standardized AnalyzerResult.
        """
        pass
