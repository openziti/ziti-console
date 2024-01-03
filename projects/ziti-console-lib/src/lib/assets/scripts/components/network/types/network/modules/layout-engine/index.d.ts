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

declare type Levels = Record<string | number, number>;
interface Edge {
    connected: boolean;
    from: Node;
    fromId: string | number;
    to: Node;
    toId: string | number;
}
interface Node {
    id: string | number;
    edges: Edge[];
}
/**
 * Assign levels to nodes according to their positions in the hierarchy. Leaves will be lined up at the bottom and all other nodes as close to their children as possible.
 *
 * @param nodes - Nodes of the graph.
 * @param levels - If present levels will be added to it, if not a new object will be created.
 *
 * @returns Populated node levels.
 */
export declare function fillLevelsByDirectionLeaves(nodes: Node[], levels?: Levels): Levels;
/**
 * Assign levels to nodes according to their positions in the hierarchy. Roots will be lined up at the top and all nodes as close to their parents as possible.
 *
 * @param nodes - Nodes of the graph.
 * @param levels - If present levels will be added to it, if not a new object will be created.
 *
 * @returns Populated node levels.
 */
export declare function fillLevelsByDirectionRoots(nodes: Node[], levels?: Levels): Levels;
export {};
//# sourceMappingURL=index.d.ts.map
