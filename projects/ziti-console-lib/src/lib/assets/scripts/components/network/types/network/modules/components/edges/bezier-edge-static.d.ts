/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import { BezierEdgeBase } from "./util/bezier-edge-base";
import { EdgeFormattingValues, Label, EdgeOptions, Point, PointT, SelectiveRequired, VBody, VNode } from "./util/types";
/**
 * A Static Bezier Edge. Bezier curves are used to model smooth gradual curves in paths between nodes.
 */
export declare class BezierEdgeStatic extends BezierEdgeBase<Point> {
    /**
     * Create a new instance.
     *
     * @param options - The options object of given edge.
     * @param body - The body of the network.
     * @param labelModule - Label module.
     */
    constructor(options: EdgeOptions, body: VBody, labelModule: Label);
    /** @inheritdoc */
    protected _line(ctx: CanvasRenderingContext2D, values: SelectiveRequired<EdgeFormattingValues, "backgroundColor" | "backgroundSize" | "shadowColor" | "shadowSize" | "shadowX" | "shadowY">, viaNode: Point): void;
    /** @inheritdoc */
    getViaNode(): Point;
    /**
     * Compute the coordinates of the via node.
     *
     * @remarks
     * We do not use the to and fromPoints here to make the via nodes the same as edges without arrows.
     *
     * @returns Cartesian coordinates of the via node.
     */
    protected _getViaCoordinates(): Point;
    /** @inheritdoc */
    protected _findBorderPosition(nearNode: VNode, ctx: CanvasRenderingContext2D, options?: {
        via?: Point;
    }): PointT;
    /** @inheritdoc */
    protected _getDistanceToEdge(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, viaNode?: Point): number;
    /** @inheritdoc */
    getPoint(position: number, viaNode?: Point): Point;
}
//# sourceMappingURL=bezier-edge-static.d.ts.map
