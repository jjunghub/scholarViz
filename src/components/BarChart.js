import React, { Component } from 'react'
import '../App.css'
import  * as d3 from 'd3';


class BarChart extends Component {
    constructor(props){
        super(props)
        this.createBarChart = this.createBarChart.bind(this)
    }
    componentDidMount() {
        this.createBarChart()
    }
    componentDidUpdate() {
        this.createBarChart()
    }
    createBarChart() {
        const data_p = this.props.data_p;
        const data_l = this.props.data_l;
        console.log("in chartComp 총 데이터 수 : ", data_p.length, data_l.length); 
        
        console.log('maxcite',d3.max(data_p, d => d.max_cite));
        // const node = this.node
        // const dataMax = max(this.props.data)
        // const yScale = scaleLinear()
        //  .domain([0, dataMax])
        //  .range([0, this.props.size[1]])
        // select(node)
        //     .selectAll('rect')
        //     .data(this.props.data)
        //     .enter()
        //     .append('rect')
        
        // select(node)
        //     .selectAll('rect')
        //     .data(this.props.data)
        //     .exit()
        //     .remove()
        
        // select(node)
        //     .selectAll('rect')
        //     .data(this.props.data)
        //     .style('fill', '#fe9922')
        //     .attr('x', (d,i) => i * 25)
        //     .attr('y', d => this.props.size[1] - yScale(d))
        //     .attr('height', d => yScale(d))
        //     .attr('width', 25)
    }
    render() {
        return <svg ref={node => this.node = node}
        width={500} height={500}>
        </svg>
    }
}
export default BarChart