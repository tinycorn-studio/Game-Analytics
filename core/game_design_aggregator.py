from typing import List, Dict, Any, Optional
import os
import pandas as pd
from .analyzers.base_analyzer import BaseGameAnalyzer, AnalyzerResult
from .analyzers.level_matrix_analyzer import LevelMatrixAnalyzer
from .analyzers.mechanics_catalog_analyzer import MechanicsCatalogAnalyzer
from .analyzers.level_curve_analyzer import LevelCurveMechanicsAnalyzer
from .analyzers.ftue_analyzer import FTUEMechanicsAnalyzer
from .analyzers.booster_analyzer import BoosterProgressionAnalyzer
from .analyzers.pacing_analyzer import PacingDifficultyAnalyzer
from .analyzers.summary_analyzer import ExecutiveSummaryAnalyzer

class GameDesignAggregator:
    """
    Coordinator class (Dependency Inversion & Open/Closed Principle)
    Orchestrates specialized Game Design Analyzers to generate a unified multi-sheet report.
    """

    def __init__(self, analyzers: Optional[List[BaseGameAnalyzer]] = None):
        self._analyzers: List[BaseGameAnalyzer] = analyzers if analyzers is not None else []
        if not self._analyzers:
            # Complete 6-Tab Game Design analysis suite
            self.register_analyzer(LevelMatrixAnalyzer())
            self.register_analyzer(MechanicsCatalogAnalyzer())
            self.register_analyzer(LevelCurveMechanicsAnalyzer())
            self.register_analyzer(BoosterProgressionAnalyzer())
            self.register_analyzer(PacingDifficultyAnalyzer())
            self.register_analyzer(ExecutiveSummaryAnalyzer())

    def register_analyzer(self, analyzer: BaseGameAnalyzer):
        """Allows dynamic extension with new analyzers without altering coordinator code (OCP)."""
        self._analyzers.append(analyzer)

    def run_all(self, vp: Any, levels_data: List[Dict[str, Any]], profile: Optional[Any] = None) -> Dict[str, AnalyzerResult]:
        """
        Executes all registered analyzers sequentially and returns dictionary mapping sheet_name -> AnalyzerResult.
        """
        results: Dict[str, AnalyzerResult] = {}
        for analyzer in self._analyzers:
            try:
                res = analyzer.analyze(vp, levels_data, profile)
                results[res.sheet_name] = res
            except Exception as e:
                print(f"[GameDesignAggregator] Error executing analyzer {analyzer.get_sheet_name()}: {e}")
        return results

    def build_webhook_payload(self, game_name: str, results: Dict[str, AnalyzerResult], github_repo_base: str, cache_buster: int) -> Dict[str, Any]:
        """
        Builds standardized multi-sheet payload for Google Apps Script Webhook.
        """
        sheets_payload = []
        for sheet_name, res in results.items():
            # Format rows, replacing relative image paths with full raw github URLs
            formatted_rows = []
            for row in res.rows:
                new_row = []
                for cell in row:
                    val_str = str(cell)
                    if isinstance(cell, bool):
                        new_row.append({"type": "checkbox", "value": cell})
                    elif val_str.endswith(".jpg") or val_str.endswith(".png"):
                        # Build CDN image url
                        clean_path = val_str.replace("\\", "/")
                        if clean_path.startswith("boosters/"):
                            img_url = f"{github_repo_base}/projects/{game_name}/{clean_path}?v={cache_buster}"
                        else:
                            img_url = f"{github_repo_base}/projects/{game_name}/levels/{clean_path}?v={cache_buster}"
                        new_row.append({"type": "image", "url": img_url, "rel_path": val_str})
                    else:
                        new_row.append({"type": "text", "value": cell})
                formatted_rows.append(new_row)

            sheets_payload.append({
                "sheet_name": sheet_name,
                "display_title": res.display_title,
                "headers": res.headers,
                "column_widths": res.column_widths or {},
                "rows": formatted_rows,
                "summary": res.summary_metrics
            })

        return {
            "game_name": game_name,
            "multi_tab": True,
            "sheets": sheets_payload
        }

    def export_excel(self, output_path: str, results: Dict[str, AnalyzerResult]):
        """
        Exports all analyzer results into a single multi-tab Excel (.xlsx) file.
        """
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            for sheet_name, res in results.items():
                df = res.to_dataframe()
                # Clean sheet name (max 31 chars for Excel)
                safe_name = sheet_name[:30]
                df.to_excel(writer, sheet_name=safe_name, index=False)
