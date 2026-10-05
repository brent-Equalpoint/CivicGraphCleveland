/* The d3 parts the United States graph uses (docs/plan-us-graph-rebuild.md): the force simulation and the zoom, nothing else.
   Not JSX and not compiled like the other ext files: build.py bundles this one file with esbuild from the pinned npm packages
   (package.json: d3-force 3.0.0, d3-zoom 3.0.0, d3-selection 3.0.0, the versions d3 7.9.0 is made of) into the page as CXD3,
   so no script comes from another site and the Content-Security-Policy hash covers it. The kit this follows is in
   vendor/relationship-map-kit/. d3 is by Mike Bostock, ISC license; the notice below travels with the bundle. */
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';

export const notice = 'd3-force 3.0.0, d3-zoom 3.0.0, d3-selection 3.0.0, and the d3 modules they use. Copyright 2010-2023 Mike Bostock. ISC License: permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.';
export { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY, zoom, zoomIdentity, select };
