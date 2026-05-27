declare module "react-plotly.js" {
  import { Component } from "react";

  export interface PlotParams {
    data: any[];
    layout?: any;
    config?: any;
    frames?: any[];
    style?: React.CSSProperties;
    useResizeHandler?: boolean;
    onInitialized?: (figure: any, graphDiv: HTMLElement) => void;
    onUpdate?: (figure: any, graphDiv: HTMLElement) => void;
    onPurge?: (figure: any, graphDiv: HTMLElement) => void;
    revision?: number;
  }

  export default class Plot extends Component<PlotParams> {}
}
