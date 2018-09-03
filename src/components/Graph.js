import React, { Component, Fragment } from 'react'
import './Graph.css'
import  * as d3 from 'd3';

class Graph extends Component {
    width = '600';
    height = '300';
    nodes = [];
    links = [];

    makeShowData = () => {
        const {data_p, data_l, pids_top_a, pids_top_b} = this.props;

        const pids = d3.set(pids_top_a.concat(pids_top_b)).values().map(d => +d);
        
        this.nodes = data_p.filter(d => pids.includes(d.p_id));
        this.links = data_l.filter(d => (pids.includes(d.p_id) && pids.includes(d.citedby)))
                            .map(d => ({'source' : d.p_id, 'target' : d.citedby}));

        console.log(this.nodes);
        console.log(this.links);
    }

    draw = () => {
        let nodes = this.nodes;
        const links = this.links;
        const width = this.width;
        const height = this.height;

        const root = d3.select('svg.Graph-svg')
                        .attr('width', this.width)
                        .attr('height', this.height);

        const P = {'L' : 10, 'R' : 10, 'B' : 10, 'T' : 10};
        const R = {'max' : 6, 'min' : 2};

        root.select('g.chart')
        .style("transform", 'translate(' + P.L + 'px, ' + P.T + 'px)');

        const xScale = d3.scaleLinear()
            .domain(d3.extent(nodes, d => d.pub_year))
            .range([R.max, width - P.L - P.R - 2*R.max]);
        const yScale = d3.scaleLog()
            .domain([1, d3.max(nodes, d => d.max_cite+1)])
            .range([height - P.B - R.max, R.max + P.T]);

        const r_log = d3.scaleLog()
                        .domain([1, d3.max(nodes, d => d.max_cite+1)])
                        .range([R.min, R.max]);

        console.log(links);

        const drawfigures = function () {
            //console.log('draw');
            // Draw nodes
            const figure_nodes = d3.select('g.nodes').selectAll('g.node').data(nodes, d => d.p_id);
            const node_enter = figure_nodes.enter().append('g').attr('class', 'node');
            node_enter.append('circle');

            figure_nodes.exit().remove();

            node_enter.merge(figure_nodes).select('circle')
                .attr('r', d => r_log(d.max_cite + 1))
                .attr('cx', d => xScale(d.pub_year))
                .attr('cy', d => yScale(d.max_cite + 1));
                // .attr('cx', d => d.x)
                // .attr('cy', d => d.y);
            // Draw links
            const figure_links = d3.select('g.links').selectAll('line').data(links);
            figure_links.enter().append('line').merge(figure_links)
                .attr("x1", d =>  xScale(nodes.filter(dd => +dd.p_id === +d.source)[0].pub_year))
                .attr("y1", d =>  yScale(nodes.filter(dd => +dd.p_id === +d.source)[0].max_cite + 1))
                .attr("x2", d =>  xScale(nodes.filter(dd => +dd.p_id === +d.target)[0].pub_year))
                .attr("y2", d =>  yScale(nodes.filter(dd => +dd.p_id === +d.target)[0].max_cite + 1));
                // .attr("x1", d =>  d.source.x)
                // .attr("y1", d =>  d.source.y)
                // .attr("x2", d =>  d.target.x)
                // .attr("y2", d =>  d.target.y);
            figure_links.exit().remove();
        }

        drawfigures();

        // let simul = d3.forceSimulation(nodes)
        //     .force('x', d3.forceX(d => xScale(d.pub_year)).strength(5))
        //     // .force('x', d3.forceX(d => xScale(d.pub_year)).strength(8))
        //     .force('y', d3.forceY(height/2).strength(0.5))
        //     //.force('y', d3.forceY(d => Math.floor(Math.random() * (height-P.T-P.B-2*R.max) + P.T+R.max)).strength(1))
        //     .force('collide', d3.forceCollide(d => r_log(Math.max(1,d.max_cite))+1))
        //     .force('link', d3.forceLink(links).id(d => d.p_id).distance(1).strength(1))
        //     .force('charge', d3.forceManyBody().strength(-200))
        //     .on('tick', drawfigures)
        //     .on('end', drawfigures);


        

    }

    componentDidMount() {
        console.log('componentdidmount');
    }

    componentDidUpdate(){
        console.log('componentdidupdate');
        if (this.props.data_p.length > 0) {
            this.makeShowData();
            this.draw();
        }
    }

    shouldComponentUpdate(nextProps, nextState){
        if (nextProps !== this.props) {
            console.log('update');
            return true;
        }
        return false;
    }


    render() {
        return (
            <Fragment>
                <svg className = "Graph-svg">
                    <g className = 'chart'>
                        <g className = 'links'/>
                        <g className = 'nodes'/>
                    </g>
                </svg>
            </Fragment>
        );
    }
}

export default Graph;