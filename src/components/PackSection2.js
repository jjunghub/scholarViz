import React, { Component, Fragment } from 'react';
import './PackSection.css';
import  * as d3 from 'd3';

// for slider component :)
import 'rc-slider/assets/index.css';
import 'rc-tooltip/assets/bootstrap.css';
import Tooltip from 'rc-tooltip';
import Slider from 'rc-slider';

const createSliderWithTooltip = Slider.createSliderWithTooltip;
const Range = createSliderWithTooltip(Slider.Range);
const Handle = Slider.Handle;

class PackSection2 extends Component {
    state = {
        control_range : {
            'count' : [0,100000],
            'cite' : [0,100000],
            'cofrom' : [1950,2100]
        },
        filter : {
            'count' : [0,100000],
            'cite' : [0,100000],
            'cofrom' : [1950,2100],
            'n_limit' : 30
        },
        marks : {
            'count' : {},
            'cite' : {},
            'cofrom' : {}
        }
      };


    showyear = 2018;
    targetSVG = "#circlePack";
    tags = [];
    sliderReady = false;
    vis_r = 25;

    focus;
    focustags;
    querytags;

    rootnodes;


    makeInsideTagData = (querytags) => {
        console.log(querytags);
        let data = this.props.data_p;

        data = data.filter(d => {
            let isin = true;
            querytags.forEach((atag) => {isin = isin & d.tags.includes(atag)});
            return isin;
        });

        // console.log(data.length);


        // const data = this.props.data_p;//.filter(d => d.pub_year==this.showyear);
        //make tag dataset
        let tags = [];
        data.forEach(d => {
            tags = tags.concat(d.tags.map(tag => ({
                'tag' : tag,
                'citeSum' : +d.max_cite,
                'coyear' : +d.pub_year
            })));
        });

        tags = d3.nest().key(d => d.tag)
                .rollup(d => ({'count' : d.length, 'cite' : d3.sum(d, d => d.citeSum), 'cofrom' : d3.min(d, d=>d.coyear), 'nestyear' : d3.set(d.map(da=>da.coyear)).values().map(da=>({'year' : +da, 'count' : d.filter(d=>+d.coyear===+da).length}))}))
                .entries(tags).filter(d => (!querytags.includes(d.key)));

        console.log(tags);

        d3.select('#session_p_count').html(
            '<b>' + data.length+ '</b>' + " papers, " + 
            '<b>' + tags.length+ '</b>' + " co-tags" + 
        " include in this session.");


        return tags;

        // this.count_range = d3.extent(this.tags, d=> d.value.count);
        // this.cite_range = d3.extent(this.tags, d=> d.value.cite);
        // this.cofrom_range = d3.extent(this.tags, d=> d.value.cofrom);

    }
    redrawPacks = () => {
        const g = d3.select(this.targetSVG).select('g');
        let focus = this.focus;
        let rootnodes = this.rootnodes;
        const dm = +parseFloat(d3.select(this.targetSVG).node().clientWidth);

        let except_tags = this.props.search_tags;

        const color = d3.scaleLinear()
            .domain([-1, 5])
            .range(["hsl(187,69%,70%)", "hsl(228,30%,40%)"])
            .interpolate(d3.interpolateHcl);

        //draw circlepack
        let margin = focus.r/50;
        // let zoom_margin =  50*margin;
  

        const controlFocusChild = () => {
            //filtering by control value
            let tags = this.focustags;
            let except_tags = [];
            let n_limit = this.state.filter.n_limit;
            const filter = this.state.filter;

            console.log(filter);
            const nofilter = tags.length;
            tags = tags.filter(d => (!except_tags.includes(d.key) && 
                    (filter['count'][0] <= d.value.count && d.value.count <= filter['count'][1]) &&
                    (filter['cite'][0] <= d.value.cite && d.value.cite <= filter['cite'][1]) &&
                    (filter['cofrom'][0] <= d.value.cofrom && d.value.cofrom <= filter['cofrom'][1])
                ));

            d3.select('#totalTag').html('<b>' + tags.length + '</b> of '+nofilter);

    
            if (tags.length>n_limit){
                console.log(tags);
                tags = tags.sort((a,b) => (b.value.count - a.value.count));
                if (false) {
                    // ETC포함
                    tags[Math.min(n_limit,tags.length)] = {'key':'ETC', 'value': {'count':d3.sum(tags.slice(n_limit,tags.length+1), d=>d.value.count)}};
                    tags = tags.slice(0,n_limit+1)
                }
                else {
                    tags = tags.slice(0,n_limit)
                }
                console.log(tags);
            }
            else if(tags.length==0){
                g.selectAll('circle,.label').remove();
                return;
            }


            let insideroot = {'name' : focus.data.name, 'children' : tags.map(d => ({'name' : d.key, 'size' : d.value.count}))};

            let pack = d3.pack().size([focus.r*2-margin, focus.r*2-margin]).padding(margin);
    
            // let view;
            let nodes = pack(d3.hierarchy(insideroot)
                                .sum(d => (d.size))
                                .sort((a, b) => (b.value - a.value))).descendants();

            let childnodes = nodes[0].children.map(d => ({
                ...d,
                'depth' : +d.depth+focus.depth,
                'parent' : focus,
                'x' : +d.x+focus.x-nodes[0].x,
                'y' : +d.y+focus.y-nodes[0].y
            }));
            console.log(childnodes);
            return childnodes;
        }

        let childnodes = controlFocusChild();
        rootnodes = rootnodes.filter(d => d.parent!=focus);
        focus.child = childnodes;
        rootnodes.push.apply(rootnodes, childnodes);
        console.log(rootnodes);

        if(childnodes === undefined){
            g.select('.emptychild').style('visibility', 'visible');
            return;
        }
        else{
            g.select('.emptychild').style('visibility', 'hidden');
        }

        //Draw
        let circle = g.selectAll("circle").data(rootnodes);
        circle.enter().append("circle")
            .merge(circle)
            .attr("class", function(d) { return d.depth <= focus.depth+1 ? d.depth < focus.depth+1 ? "node" : "node node--leaf" : "node node--hide"; })
            // .attr("class", function(d) { return d.parent ? d.children ? "node" : "node node--leaf" : "node node--root"; })
            .on('mouseover', (hoverD) => {
                g.selectAll('.label').filter(d => d===hoverD).style('display','inline');
                g.selectAll('.label').filter(d => d!==hoverD).style('display','none');
            })
            .on('mouseout', (hoverD) => {
                this.labelDisplay();
                d3.select('.tooltip').style('visibility', 'hidden');

            })
            .style("fill", function(d) { return d.depth===focus.depth+1 ? null : color(d.depth)})
            // .style("fill", function(d) { return d.children ? color(d.depth) : null; })
            .on("click", (d) => { 
                if (d3.select('.tooltip').style('visibility')==='hidden' & focus.depth < d.depth){
                    d3.select('.tooltip').style('visibility', 'visible')
                        .style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
                    this.drawTagTrend(this.focustags.filter(tag=>tag.key === d.data.name)[0]);
                    // .style("left", hoverD.x + "px")     
                    // .style("top", hoverD.y+ "px");
                    return;
                }
                if (focus !== d) {
                    d3.select('.tooltip').style('visibility', 'hidden');

                    //zoom in 
                    if (focus.depth < d.depth){
                        this.rootnodes = rootnodes;
                        // this.querytags = this.querytags.concat(d.data.name);

                    }
                    else if(focus.depth == d.dpeth){


                        this.rootnodes = this.rootnodes;
                        // this.querytags = this.querytags.slice(0, d.depth).concat(d.data.name);

                        
                    }
                    else {
                        this.rootnodes = this.rootnodes.filter(node => node.depth<=d.depth);

                        this.rootnodes = this.rootnodes.map(node => {
                            if (node.depth === d.depth) {
                                return {
                                    ...node,
                                    'child' : undefined
                                }
                            }
                            return node;
                        });
                    }
                    this.querytags = this.querytags.slice(0, d.depth).concat(d.data.name);
                    this.focustags = this.makeInsideTagData(this.querytags);
                    this.focus = d;
                    
                    this.props.refreshSearchTags(this.querytags);
                    this.setConrolRanges();
                    this.redrawPacks();
                    d3.event.stopPropagation(); 
                    // packClickControl(d), d3.event.stopPropagation(); 
                    this.zoomAnimation([this.focus.x, this.focus.y, this.focus.r * 2 + this.focus.r/4]);
                }
            });

        circle.exit().remove();
        // circle.append('text').attr('class', 'label').text(d => d.data.name);

        let text = g.selectAll("text.label").data(rootnodes);
        text.enter().append("text")
            .attr("class", "label")
            .merge(text)
                //   .style("fill-opacity", 1)
                //   .style("fill-opacity", function(d,i) { return i <= 10 ? 1 : 0; })
                //   .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })

            .text(function(d) { return d.data.name; })
            .raise();

        text.exit().remove();

         // const zoomTo = (v) => {
        //     let k = dm / v[2]; 
        //     view = v;

        //     g.selectAll('circle,.label')
        //         .attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
            
        //     g.selectAll('circle')
        //         .attr("r", function(d) { return d.r * k; });
        // };
        // zoomTo([focus.x, focus.y, focus.r * 2 + margin]);
    }
    drawTagTrend = (tagdata) => {
        const tooltip = d3.select('.tooltip');
        tooltip.selectAll('svg,div').remove();

        tooltip.html('<div class="tag">'+tagdata.key+'</div>' +
        '<div><small>' + ' from: <b>' + tagdata.value.cofrom + '</b>, count: <b>' + tagdata.value.count + '</b>, cite: <b>' + tagdata.value.cite + '</b></small></div>');
        // tooltip.html('count:' + d.value.count + 'cite:' + d.value.cite);
        // tooltip.append('div').attr('class','sessiontag').text(d.key);
        // tooltip.append('div').attr('class','tooltipinfo').text('from:' + d.value.cofrom + ', count:' + d.value.count + ', cite:' + d.value.cite);

        const width = 300;
        const height = 150;
        const targetSVG = tooltip.append('svg').attr('width',width+'px').attr('height',height+'px');
        const g = targetSVG.append('g').attr('class','figures');
        g.append('g').attr('class', 'axis x-axis');
        g.append('g').attr('class', 'axis y-axis');
        g.append('path').attr('class', 'line');

        const P = {'L': 30, 'T':10, 'B':30, 'R':10};
        const ykey = 'count';


        console.log(width, height);
        const data = tagdata.value.nestyear.sort((a,b) => d3.ascending(a.year,b.year));

        console.log(data);

        const year = d3.extent(data, d=>d.year);
        console.log(year);
        const xScale = d3.scaleLinear()
                    .domain(year)
                    .range([0, width - P.L - P.R]);
        
        const yScale = d3.scaleLog()
                    .domain([1, d3.max(data, d => d[ykey])+1])
                    .range([height - P.T - P.B, 0]);
        

        const xAxis = d3.axisBottom().scale(xScale).tickFormat(d3.format(".4d")).ticks(5);
        const yAxis = d3.axisLeft().scale(yScale)
                        .tickValues([1, 11,101,1001,10001, yScale.domain()[1]])
                        .tickFormat(function(d){
                            d = d-1;
                            if(d <= yScale.domain()[1]){
                                let s = d;
                                if (d >= 1000){
                                    s = d3.format("2d")(d / 1000);
                                    return s + "k";
                                }
                                // if (yScale.domain()[1] > 1000){
                                //     s = d3.format(".1f")(d / 1000);
                                //     return this.parentNode.nextSibling
                                //     ? "\xa0" + s
                                //     : s + "k";
                                // }
                                return s;
                            }
                            return "";
                        });

        const d3line = d3.line().x(d => xScale(d.year))
                                .y(d => yScale(d[ykey]+1));

        targetSVG.select('g.figures').style('transform', 'translate(' + P.L + 'px, ' + P.T + 'px)')
            .select('path.line').attr('d', d3line(data));

        // let circles = targetSVG.select('g.circles').selectAll('circle').data(data, d=>d.key);
        // circles.enter().append('circle')
        //         .merge(circles)
        //         .attr('cx', d => xScale(d.key))
        //         .attr('cy', d => yScale(d[ykey] + 1))
        //         .attr('r', 3)
        //         .on("click", this.toggleSelect)
        //         .on("mouseover", this.hover)
        //         .on("mouseout", this.mouseOut);

        targetSVG.select('.x-axis')
            .style('transform', 'translate(' + 0 + 'px, ' + (height - P.B - P.T) + 'px)')
            .call(xAxis);
        targetSVG.select('.y-axis').call(yAxis);


    }
    zoomAnimation = (v) => {
        let g = d3.select(this.targetSVG).select('g');

        let transition = d3.transition()
            // .duration(false ? 7500 : 500)
            .duration(d3.event.altKey ? 7500 : 750)
            .tween("zoom", d => {
                const i = d3.interpolateZoom(this.view, v);
            
                return (t) => (this.zoomTo(i(t)));
            });

    }    
    zoomTrans = (v) => {
        const svg = d3.select(this.targetSVG);
        const dm = +parseFloat(svg.node().clientWidth);
        let g = svg.select('g');

        this.k = dm / v[2]; 
        this.view = v;

        g.selectAll('circle')
            .transition().duration(500)
            .attr("transform", (d) => ("translate(" + (d.x - v[0]) * this.k + "," + (d.y - v[1]) * this.k + ")"))
            .attr("r", (d) => (d.r * this.k));

        g.selectAll('.label')
            .transition().duration(500)
            .attr("transform", (d) => ("translate(" + (d.x - v[0]) * this.k + "," + (d.y - v[1]) * this.k + ")"));
        this.labelDisplay();
    };
    zoomTo = (v) => {
        const svg = d3.select(this.targetSVG);
        const dm = +parseFloat(svg.node().clientWidth);
        let g = svg.select('g');

        this.k = dm / v[2]; 
        this.view = v;

        g.selectAll('circle')
            // .transition().duration(300)
            .attr("transform", (d) => ("translate(" + (d.x - v[0]) * this.k + "," + (d.y - v[1]) * this.k + ")"))
            .attr("r", (d) => (d.r * this.k));

        g.selectAll('.label')
            // .transition().duration(300)
            .attr("transform", (d) => ("translate(" + (d.x - v[0]) * this.k + "," + (d.y - v[1]) * this.k + ")"));


        // g.selectAll('circle,.label')
        //     .transition().duration(20)
        //     .attr("transform", (d) => ("translate(" + (d.x - v[0]) * this.k + "," + (d.y - v[1]) * this.k + ")"));
        
        // g.selectAll('circle')
        //     .transition().duration(20)
        //     .attr("r", (d) => (d.r * this.k));

        this.labelDisplay();
    };
    labelDisplay = () => {
        const g = d3.select(this.targetSVG).select('g');
        g.selectAll('.label').style("display", (dtext) => { 
            let r = 0;
            let depth = 0;
            // console.log(dtext);
            g.selectAll('circle').filter(d => d===dtext).each(d=> {
                r = d.r;
                depth = d.depth;
            });
            return +r*this.k > this.vis_r && depth===this.focus.depth+1 ? "inline" : "none";
        })
    }
    setConrolRanges = () => {
        this.setState({
            'control_range' : {
                'count' : d3.extent(this.focustags, d=> d.value.count),
                'cite' : d3.extent(this.focustags, d=> d.value.cite),
                'cofrom' : d3.extent(this.focustags, d=> d.value.cofrom)
            },
            'filter' : {
                'count' : d3.extent(this.focustags, d=> d.value.count),
                'cite' : d3.extent(this.focustags, d=> d.value.cite),
                'cofrom' : d3.extent(this.focustags, d=> d.value.cofrom),
                'n_limit' : this.state.filter.n_limit
            },
            'marks' : {
                'cofrom' : this.getmarks('cofrom'),
                'count' : this.getmarks('count'),
                'cite' : this.getmarks('cite')
            }
        });
    }
    getmarks = (type) => {
        let dict = {};
        d3.set(this.focustags.map(d=>d.value[type])).values().forEach(d=>{dict[d] = ''})
        return dict
    }

    initCirclePack = () => {
        const svg = d3.select(this.targetSVG);
        const margin = 20;
        const dm = +parseFloat(svg.node().clientWidth);
        console.log(dm);
        let g = svg.select("g").attr("transform", "translate(" + (dm / 2) + "," + (dm / 2) + ")");
  
        console.log('create circle pack');
        let root = {'name' : this.props.search_tags[0], 'children' : [{'name' : 'temp', 'size' : 100}]};
        let pack = d3.pack().size([dm-margin, dm-margin]).padding(2);
        this.rootnodes = pack(d3.hierarchy(root)
                            .sum(d => (d.size))
                            .sort((a, b) => (b.value - a.value))).descendants();
        this.focus = this.rootnodes[0];
        this.querytags = this.props.search_tags;
        this.focustags = this.makeInsideTagData(this.querytags);

        this.setConrolRanges();
        this.redrawPacks();

        this.zoomTo([this.focus.x, this.focus.y, this.focus.r * 2 + this.focus.r/4]);
    }

    shouldComponentUpdate(nextProps, nextState){
        console.log('PackSection shouldComponentUpdate');
        console.log(this.props, nextProps);
        console.log(this.state, nextState);

        if(nextProps.data_p.length==0) return false;
        if (nextProps.search_tags !== this.props.search_tags){
            console.log('searchtag change');
            return false;
        }
        if (nextProps !== this.props) {
            console.log('new props come into pack');
            this.init = true;
            this.redraw = false;
            return true;
        }
        if (nextState.control_range !== this.state.control_range) {
            console.log('range changed');
            this.init = false;
            this.redraw = false;
            return true;
        }
        if (nextState.filter !== this.state.filter){
            console.log('filter changed');
            this.init = false;
            this.redraw = true;
            return true;
        }

        return false;
    }
    componentDidUpdate(){
        console.log('PackSection component didupdate');
        if (this.props.data_p.length > 0) {
            if (this.init) this.initCirclePack();
            else if(this.redraw) {
                this.redrawPacks();
                this.zoomTrans([this.focus.x, this.focus.y, this.focus.r * 2 + this.focus.r/4]);
            }
        }    
    }
    componentDidMount(){
        console.log("PackSection component did mount");
    }

    handleSlider = (props) => {
        const { value, dragging, index, ...restProps } = props;
        if (value!==this.state.filter.n_limit){
            console.log(value, dragging);
            console.log(value, this.state.filter.n_limit);
            this.setState({
                ...this.state,
                'filter' : {
                    ...this.state.filter,
                    'n_limit' : value
                }
            })
        }

        return (
          <Tooltip
            prefixCls="rc-slider-tooltip"
            overlay={value}
            visible={dragging}
            placement="top"
            key={index}
          >
            <Handle value={value} {...restProps} />
          </Tooltip>
        );
      };

    handleCofromChange = (value) => {
        const oldValue = this.state.filter.cofrom;
        if(value[0]!==oldValue[0] | value[1]!==oldValue[1]){
        // if(JSON.stringify(value) !== JSON.stringify(this.state.filter.cofrom)){
            this.setState({
                ...this.state,
                'filter' : {
                    ...this.state.filter,
                    'cofrom' : value
                }
            })
        }
    }
    handleCountChange = (value) => {
        const oldValue = this.state.filter.count;
        if(value[0]!==oldValue[0] | value[1]!==oldValue[1]){
            this.setState({
                ...this.state,
                'filter' : {
                    ...this.state.filter,
                    'count' : value
                }
            })
        }
    }
    handleCiteChange = (value) => {
        const oldValue = this.state.filter.cite;
        if(value[0]!==oldValue[0] | value[1]!==oldValue[1]){
            this.setState({
                ...this.state,
                'filter' : {
                    ...this.state.filter,
                    'cite' : value
                }
            })
        }
    }
    
    render(){
        const control_range = this.state.control_range;
        const filter= this.state.filter;

        console.log(control_range);

        return(
            <div>                
                <div id='session_p_count'></div>

                <div className="packSection">
                    <svg id="circlePack">
                        <g>
                        <text className="emptychild">NO DATA IN THIS CONDITION</text>
                        </g>
                    </svg>

                    <div className="control-wrapper">
                        <div className="controlPanel">
                            <p>TAG FILTER : <b id="totalTag">113</b></p>
                            <div className="slider-wrapper">
                                <div className='slidertitle'><b>co-detected from</b> ({filter['cofrom'][0]}~{filter['cofrom'][1]})</div>
                                <div className='slidere'>
                                    <Range id='cofromRange' min={control_range['cofrom'][0]} max={control_range['cofrom'][1]} value={filter['cofrom']} onChange={this.handleCofromChange} marks={this.state.marks.cofrom} step={null} dots={false}/>
                                </div>
                            </div>
                            <div className="slider-wrapper">
                                <div className='slidertitle'><b>total count</b> ({filter['count'][0]}~{filter['count'][1]})</div>
                                <div className='slidere'>
                                    <Range min={control_range['count'][0]} max={control_range['count'][1]} value={filter['count']} onChange={this.handleCountChange} marks={this.state.marks.count} step={null}/>
                                </div>
                            </div>
                            <div className="slider-wrapper">
                                <div className='slidertitle'><b>total cite</b> ({filter['cite'][0]}~{filter['cite'][1]})</div>
                                <div className='slidere'>
                                    <Range min={control_range['cite'][0]} max={control_range['cite'][1]} value={filter['cite']} onChange={this.handleCiteChange} marks={this.state.marks.cite} step={null}/>
                                </div>
                            </div>
                        </div>

                        <div className="controlPanel">
                            <p>CONTORL DISPLAY</p>
                            <div className="slider-wrapper">
                                <div className='slidertitle'><b>display top</b> ({filter['n_limit']})</div>
                                <div className='slidere'>
                                    <Slider min={1} max={200} defaultValue={30} handle={this.handleSlider}/>
                                </div>
                            </div>
                        </div>

                            {/* <p>GROUP BY</p> */}

                            {/* <div className="slider">
                                <p>CITATION NUMBER : {this.state.tagpack_n_limit}</p>
                                <Slider min={0} max={20} defaultValue={10} handle={this.handleSlider}/>
                            </div>
                            <div className="slider">
                                <p>CITATION NUMBER : {this.state.tagpack_n_limit}</p>
                                <Range min={5} max={20} defaultValue={[3,10]} onAfterChange={this.handleChange}/>
                            </div> */}
                    </div>

                </div>
                <div className="tooltip"></div>
            </div>
        );
    }
}

export default PackSection2;
