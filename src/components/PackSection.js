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

class PackSection extends Component {
    showyear = 2018;
    targetSVG = "#circlePack";
    tags = [];
    sliderReady = false;
    count_range = [0,10000];
    cite_range = [0,1000000];
    cofrom_range = [1950,2100];

    state = {
        count_filter : [100,1000],
        cite_filter : [100,1000],
        cofrom_filter : [0,5000],
        n_limit : 50
    }
    makeTagData = (data) => {
        console.log('make tag data');
        // const data = this.props.data_p;//.filter(d => d.pub_year==this.showyear);
        const except_tags = this.props.search_tags;

        //make tag dataset
        let tags = [];
        data.forEach(d => {
            tags = tags.concat(d.tags.map(tag => ({
                'tag' : tag,
                'citeSum' : +d.max_cite,
                'coyear' : +d.pub_year,
            })));
        });

        this.tags = d3.nest().key(d => d.tag)
            .rollup(d => ({'count' : d.length, 'cite' : d3.sum(d, d => d.citeSum), 'cofrom' : d3.min(d, d=>d.coyear)}))
            .entries(tags).filter(d => (!except_tags.includes(d.key)));

        this.count_range = d3.extent(this.tags, d=> d.value.count);
        this.cite_range = d3.extent(this.tags, d=> d.value.cite);
        this.cofrom_range = d3.extent(this.tags, d=> d.value.cofrom);

    }
    makeInsideTagData = (data, querytags) => {
        console.log(querytags);

        data = data.filter(d => {
            let isin = true;
            querytags.forEach((atag) => {isin = isin & d.tags.includes(atag)});
            return isin;
        });

        console.log(data.length);

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

        return d3.nest().key(d => d.tag)
            .rollup(d => ({'count' : d.length, 'cite' : d3.sum(d, d => d.citeSum), 'cofrom' : d3.min(d, d=>d.coyear)}))
            .entries(tags).filter(d => (!querytags.includes(d.key)));

        // this.count_range = d3.extent(this.tags, d=> d.value.count);
        // this.cite_range = d3.extent(this.tags, d=> d.value.cite);
        // this.cofrom_range = d3.extent(this.tags, d=> d.value.cofrom);

    }
    createRootCirclePack = (state) => {
        console.log('create circle pack');
        this.makeInsideTagData()



        const except_tags = this.props.search_tags;
        const n_limit = state.n_limit;
        const vis_r = 15;

        const color = d3.scaleLinear()
            .domain([-1, 5])
            .range(["hsl(187,69%,70%)", "hsl(228,30%,40%)"])
            .interpolate(d3.interpolateHcl);

        //draw circlepack
        const svg = d3.select(this.targetSVG);
        const margin = 20;
        const dm = +parseFloat(svg.node().clientWidth);
        let g = svg.select("g").attr("transform", "translate(" + (dm / 2) + "," + (dm / 2) + ")");
  
        //filtering by control value
        let tags = this.tags.filter(d => (!except_tags.includes(d.key) && 
                            (state.count_filter[0] <= d.value.count && d.value.count <= state.count_filter[1]) &&
                            (state.cite_filter[0] <= d.value.cite && d.value.cite <= state.cite_filter[1]) &&
                            (state.cofrom_filter[0] <= d.value.cofrom && d.value.cofrom <= state.cofrom_filter[1])
                            // d.value.count>=limit_count
                        ));
        
        d3.select('#totalTag').html('<b>' + tags.length + '</b> of '+this.tags.length);
        console.log(state);

        if (tags.length>n_limit){
            tags = tags.sort((a,b) => (b.count - a.count));
            tags[Math.min(n_limit,tags.length)] = {'key':'ETC', 'value': {'count':d3.sum(tags.slice(n_limit,tags.length+1), d=>d.value.count)}};
            tags = tags.slice(0,n_limit+1)
            console.log(tags);
        }
        else if(tags.length==0){
            g.selectAll('circle,.label').remove();
            return;
        }


        let root = {'name' : except_tags[0], 'children' : tags.map(d => ({'name' : d.key, 'size' : d.value.count}))};
        // console.log(root);


        let pack = d3.pack().size([dm-margin, dm-margin]).padding(2);

        let view;
        let rootnodes = pack(d3.hierarchy(root)
                            .sum(d => (d.size))
                            .sort((a, b) => (b.value - a.value))).descendants();
        let focus = rootnodes[0];

        // console.log(root, nodes[0]);
        // console.log(root === nodes[0]);


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
                            g.selectAll('.label')
                            // .filter(d => d===hoverD)
                            .style("display", function(dtext) { 
                                let r = 0;
                                let depth = 0;
                                g.selectAll('circle').filter(d => d===dtext).each(d=> {
                                    r = d.r;
                                    depth = d.depth;
                                });
                                return +r > vis_r && depth==1 ? "inline" : "none";
                            });
                        })
                        .style("fill", function(d) { return d.depth===focus.depth+1 ? null : color(d.depth)})
                        // .style("fill", function(d) { return d.children ? color(d.depth) : null; })
                        .on("click", function(d) { if (focus !== d) packClickControl(d), d3.event.stopPropagation(); });

        circle.exit().remove();
        // circle.append('text').attr('class', 'label').text(d => d.data.name);

        let text = g.selectAll("text.label").data(rootnodes);
        text.enter().append("text")
                    .attr("class", "label")
                    .merge(text)
                        //   .style("fill-opacity", 1)
                        //   .style("fill-opacity", function(d,i) { return i <= 10 ? 1 : 0; })
                        //   .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
                    .style("display", function(dtext) { 
                        let r = 0;
                        let depth = 0;
                        g.selectAll('circle').filter(d => d===dtext).each(d=> {
                            r = d.r;
                            depth = d.depth;
                        });
                        return +r > vis_r && depth==1 ? "inline" : "none";
                    })
                    .text(function(d) { return d.data.name; })
                    .raise();
        text.exit().remove();

        let node = g.selectAll('circle,.label');
        const zoomTo = (v) => {
            let k = dm / v[2]; 
            view = v;

            g.selectAll('circle,.label')
                .attr("transform", function(d) { return "translate(" + (d.x - v[0]) * k + "," + (d.y - v[1]) * k + ")"; });
            
            g.selectAll('circle')
                // .transition()
                // .duration(1000)
                .attr("r", function(d) { return d.r * k; });

        };
        zoomTo([focus.x, focus.y, focus.r * 2 + margin]);

        const packClickControl = (d) => {
            let focus0 = focus; focus = d;
            let zoom_margin=margin;
            
            console.log(focus.children);
            if(focus.children===undefined){
                console.log(focus.depth, focus.data.name);
                console.log(d);

                //Make inside packs
                let tags = this.makeInsideTagData(this.props.data_p, this.props.search_tags.concat(focus.data.name));
                if (tags.length>n_limit){
                    tags = tags.sort((a,b) => (b.count - a.count));
                    tags[Math.min(n_limit,tags.length)] = {'key':'ETC', 'value': {'count':d3.sum(tags.slice(n_limit,tags.length+1), d=>d.value.count)}};
                    tags = tags.slice(0,n_limit+1)
                    console.log(tags);
                }
                else if(tags.length==0){
                    g.selectAll('circle,.label').remove();
                    return;
                }

                let insideroot = {'name' : focus.data.name, 'children' : tags.map(d => ({'name' : d.key, 'size' : d.value.count}))};
                let margin = focus.r/50;
                zoom_margin = 50*margin;

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

                focus.child = childnodes;
                rootnodes.push.apply(rootnodes, childnodes);
                console.log(rootnodes);

            }

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
                                    g.selectAll('.label')
                                    // .filter(d => d===hoverD)
                                    .style("display", function(dtext) { 
                                        let r = 0;
                                        let depth = 0;
                                        g.selectAll('circle').filter(d => d===dtext).each(d=> {
                                            r = d.r;
                                            depth = d.depth;
                                        });
                                        return +r > vis_r && depth==1 ? "inline" : "none";
                                    });
                                })
                                .style("fill", function(d) { return d.depth===focus.depth+1 ? null : color(d.depth)})
                                // .style("fill", function(d) { return d.children ? color(d.depth) : null; })
                                .on("click", function(d) { if (focus !== d) packClickControl(d), d3.event.stopPropagation(); });
        
                circle.exit().remove();
                // circle.append('text').attr('class', 'label').text(d => d.data.name);
        
                let text = g.selectAll("text.label").data(rootnodes);
                text.enter().append("text")
                            .attr("class", "label")
                            .merge(text)
                                //   .style("fill-opacity", 1)
                                //   .style("fill-opacity", function(d,i) { return i <= 10 ? 1 : 0; })
                                //   .style("fill-opacity", function(d) { return d.parent === root ? 1 : 0; })
                            .style("display", function(dtext) { 
                                let r = 0;
                                let depth = 0;
                                g.selectAll('circle').filter(d => d===dtext).each(d=> {
                                    r = d.r;
                                    depth = d.depth;
                                });
                                return +r > vis_r && depth==1 ? "inline" : "none";
                            })
                            .text(function(d) { return d.data.name; })
                            .raise();
                text.exit().remove();
                
            


            g.selectAll('.label').style("display", function(dtext) { 
                let r = 0;
                g.selectAll('circle').filter(d => d===dtext).each(d=> {r = d.r * dm / (focus.r*2 + margin)});
                    return +r > vis_r ? "inline" : "none";
                })
                .style("font-size", (dm/(2*focus.r + margin))>1.5 ? '30px':'');
            console.log((dm/(2*focus.r + margin)));
    
            let transition = d3.transition()
                .duration(d3.event.altKey ? 7500 : 750)
                .tween("zoom", d => {
                  var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2 + zoom_margin]);
                  return function(t) { zoomTo(i(t)); };
                });
        
            // transition.selectAll(".label")
            //   .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
            //     .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
            //     .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
          }


    }

    shouldComponentUpdate(nextProps, nextState){
        console.log('PackSection shouldComponentUpdate');
        console.log(this.props, nextProps);

        if(nextProps.data_p.length==0) return false;
        if (nextProps !== this.props) {
            console.log('new props come into pack');
            this.makeTagData(nextProps.data_p);
            return true;
        }
        if (nextState !== this.state) {
            console.log('state change and update');
            this.createRootCirclePack(nextState);
            return true;
        }

        return false;
    }
    componentDidUpdate(){
        console.log('PackSection component didupdate');
        if (this.props.data_p.length > 0) {
            if (!this.sliderReady) {
                console.log('sliderReady');
                this.sliderReady = true;
                this.setState({
                    ...this.state,
                    'count_filter' : [Math.max(this.count_range[0],3), this.count_range[1]],
                    'cite_filter' : [Math.max(this.cite_range[0],3), this.cite_range[1]],
                    'cofrom_filter' : [this.cofrom_range[0], this.cofrom_range[1]]
                });
            }
            // this.createCirclePack(this.state);
        }    
    }
    componentDidMount(){
        console.log("PackSection component did mount");
    }

    handleSlider = (props) => {
        const { value, dragging, index, ...restProps } = props;
        console.log(value, dragging);

        if (dragging === false){
            this.setState({
                'tagpack_n_limit' : value
              });
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

    handleCountChange = (value) => {
        this.setState({
            ...this.state,
            'count_filter' : value
        });
        console.log(value);
    }
    handleCiteChange = (value) => {
        this.setState({
            ...this.state,
            'cite_filter' : value
        });
        console.log(value);
    }
    handleCofromChange = (value) => {
        this.setState({
            ...this.state,
            'cofrom_filter' : value
        });
        console.log(value);
    }
    render(){
        const count_range = this.count_range;
        const cite_range = this.cite_range;
        const cofrom_range = this.cofrom_range;

        console.log('render', count_range, cite_range, cofrom_range);

        return(                
            <div className="packSection">
                <svg id="circlePack">
                    <g>
                    </g>
                </svg>

                <div className="pack-control">
                    <p>FILTERED TAGS : <big id="totalTag">113</big></p>
                    
                    <div className="slider">
                        <p><b>first co-occuranced year</b> ({this.state.cofrom_filter[0]}~{this.state.cofrom_filter[1]})</p>
                        <Range min={cofrom_range[0]} max={cofrom_range[1]} defaultValue={this.state.cofrom_filter} onAfterChange={this.handleCofromChange}/>
                    </div>
                    <div className="slider">
                        <p><b>detected sum</b> ({this.state.count_filter[0]}~{this.state.count_filter[1]})</p>
                        <Range min={count_range[0]} max={count_range[1]} defaultValue={this.state.count_filter} onAfterChange={this.handleCountChange}/>
                    </div>
                    <div className="slider">
                        <p><b>cited sum</b> ({this.state.cite_filter[0]}~{this.state.cite_filter[1]})</p>
                        <Range min={cite_range[0]} max={cite_range[1]} defaultValue={this.state.cite_filter} onAfterChange={this.handleCiteChange}/>
                    </div>

                    <p>TOP N</p>
                    <div className="slider">
                        <p><b>show max</b> {this.state.n_limit}</p>
                        <Slider min={5} max={200} defaultValue={this.state.n_limit} onAfterChange={this.handleSlider}/>
                    </div>

                    <p>GROUP BY</p>

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
        );
    }
}

export default PackSection;
