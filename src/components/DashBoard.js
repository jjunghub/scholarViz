import React, { Component, Fragment } from 'react'
import './DashBoard.css'
import  * as d3 from 'd3';
import PackSection from './PackSection';
import PackSection2 from './PackSection2';

// for slider component :)
import 'rc-slider/assets/index.css';
import 'rc-tooltip/assets/bootstrap.css';
import Tooltip from 'rc-tooltip';
import Slider from 'rc-slider';

const createSliderWithTooltip = Slider.createSliderWithTooltip;
const Range = createSliderWithTooltip(Slider.Range);
const Handle = Slider.Handle;

class DashBoard extends Component {
    nested_by_year = [];
    showyear = 2018;

    constructor(props) {
        super(props);
        this.state = {
            'search_tags' : props.search_tags
        }
    }

    makeShowData = () => {
        const querytags = this.state.search_tags;
        console.log(querytags);

        this.data_p = this.props.data_p.filter(d => {
            let isin = true;
            querytags.forEach((atag) => {isin = isin & d.tags.includes(atag)});
            return isin;
        });

        this.nested_by_year = d3.nest().key(d => d.pub_year).entries(this.data_p.sort((a,b) => d3.descending(a.max_cite,b.max_cite))).map(d => ({
                                    'key' : +d.key,
                                    'values' : d.values,
                                    'n_published' : d.values.length,
                                    'citeSum' : d3.sum(d.values, x => x.max_cite)
                                })).sort((a, b) => d3.ascending(a.key, b.key));
        
        console.log(this.nested_by_year);
    }

    draw = () => {
        this.createLineChart(this.nested_by_year, "#linechart1", 'n_published');
        this.createLineChart(this.nested_by_year, "#linechart2", 'citeSum');
        this.createTopTables(this.showyear);
        // this.createCirclePack("#circlePack");
    }


    toggleSelect = (clickD) => {
        const els = d3.selectAll('circle').filter(d => d===clickD);
        var isSelected = els.attr('selected');
        if (!isSelected || isSelected==='false'){
            els.attr('selected', 'true');
        }
        else {
            els.attr('selected', 'false');
        }
    }
    hover = (hoverD) => {
        console.log(hoverD);
        d3.selectAll('circle').filter(d => d===hoverD).attr('hovered','true');
        this.showyear = hoverD.key
        this.createTopTables(this.showyear);
    }
    mouseOut = (outD) => {
        d3.selectAll('circle').filter(d => d===outD).attr('hovered','false');
    }

    createLineChart = (data, targetSVG, ykey) => {
        console.log(d3.select(targetSVG).node());
        const P = {'L': 30, 'T':30, 'B':30, 'R':30};
    
        const width = parseFloat(d3.select(targetSVG).node().clientWidth);
        const height = parseFloat(d3.select(targetSVG).node().clientHeight);
        console.log(width,height);

        const year = d3.extent(data, d=>d.key);
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

        const d3line = d3.line().x(d => xScale(d.key))
                                .y(d => yScale(d[ykey]+1));

        d3.select(targetSVG).select('g.figures').style('transform', 'translate(' + P.L + 'px, ' + P.T + 'px)')
            .select('path.line').attr('d', d3line(data));

        let circles = d3.select(targetSVG).select('g.circles').selectAll('circle').data(data, d=>d.key);
        circles.enter().append('circle')
                .merge(circles)
                .attr('cx', d => xScale(d.key))
                .attr('cy', d => yScale(d[ykey] + 1))
                .attr('r', 3)
                .on("click", this.toggleSelect)
                .on("mouseover", this.hover)
                .on("mouseout", this.mouseOut);
        circles.exit().remove();

        d3.select(targetSVG).select('.x-axis')
            .style('transform', 'translate(' + 0 + 'px, ' + (height - P.B - P.T) + 'px)')
            .call(xAxis);


        d3.select(targetSVG).select('.y-axis').call(yAxis)
            .select('text.axis-label')
            .attr("dx", -(P.L*0.8) + "px")
            .attr("dy", "-0.8rem")
            .style("text-anchor", "start")
            .text(ykey);;
    }

    createTopTables = (year) => {
        d3.select('.showyear').text("Impact Top papers of " +  year);

        const n_top = 20;
        console.log(this.nested_by_year);

        if(this.nested_by_year.filter(d => d.key===year).length===0){
            this.showyear = d3.max(this.nested_by_year, d=>d.key);
            year = this.showyear;
            d3.select('.showyear').text('Impact Top papers of ' + this.showyear);

        }

        const data_in_year = this.nested_by_year.filter(d => d.key===year)[0].values;
        const except_tags = this.state.search_tags;

        // 인용수 TOP
        const topdata = data_in_year.slice(0,n_top);
        this.createSpreadsheet(topdata, "#spreadsheet1", 
        [{'display' : 'year', 'key':'pub_year'},
        {'display' : 'info', 'key':'title'}, 
        {'display' : 'cite', 'key':'max_cite'}]); 

        // 참조 TOP
        const papers = this.props.data_p;
        const links = this.props.data_l;
        let pids_year = data_in_year.map(dd => dd.p_id);

        let cited_pids = links.filter(d => pids_year.includes(d.citedby)).map(d => d.p_id);
        let top_in_a_year = d3.nest().key(d => d).rollup(d => ({'count' : d.length})).entries(cited_pids)
            // .filter(d => d.value.count > count_limit)
            .sort((a, b) => d3.descending(a.value.count, b.value.count))
            .slice(0, n_top)
            .map(d => ({'p_id' : +d.key, 'count' : +d.value.count}));
        const topReferData = papers.filter(d => top_in_a_year.map(d => +d.p_id).includes(d.p_id))
            .map(d => (
                {
                    ...d,
                    'count' : top_in_a_year.filter(t=> t.p_id === d.p_id)[0].count
                }
            ))
            .sort((a,b) => d3.descending(a.count, b.count));
        this.createSpreadsheet(topReferData, "#spreadsheet2",
        [{'display' : 'year', 'key':'pub_year'},
        {'display' : 'info', 'key':'title'}, 
        {'display' : 'cite', 'key':'max_cite'},
        {'display' : 'count', 'key':'count'}]);
        

        // Top Tag counts & cites
        // delta가 더 중요한 지표가 될수도. 빈도수 퍼센트. 
        // console.log(data_in_year);
        const cite_countlimit = 2;

        let tags = []
        data_in_year.forEach(d => {
            tags = tags.concat(d.tags.map(tag => ({
                'tag' : tag,
                'cite' : +d.max_cite
            })));
        });

        tags = d3.nest().key(d => d.tag)
            .rollup(d => ({'count' : d.length, 'cite' : d3.sum(d, d => d.cite)}))
            .entries(tags)
            .filter(d => !except_tags.includes(d.key));

        const yearCount = d3.sum(tags, d=>d.value.count);
        console.log('yearcount', yearCount);
        // console.log(tags);
        const tag_topCount = tags.sort((a,b) => d3.descending(a.value.count,b.value.count)).slice(0,n_top).map(d=>d.key);
        const tag_topCite = tags.sort((a,b) => d3.descending(a.value.cite,b.value.cite)).slice(0,n_top).map(d=>d.key);

        // console.log(tag_topCount, tag_topCite);
        const topTagdata= tags.filter(d => (tag_topCount.includes(d.key) | tag_topCite.includes(d.key)))
                            .map(d => ({'tag' : d.key, 'count' : d.value.count, 'cite' : d.value.cite, 'ratio' : (d.value.count/yearCount*100).toFixed(2)}));
        this.createSpreadsheet(topTagdata, "#tagTable",
        [{'display' : 'tag', 'key':'tag'},
        {'display' : 'count', 'key':'count'}, 
        {'display' : 'citeSum', 'key':'cite'},
        {'display' : 'ratio', 'key' : 'ratio'}]);

    }

    // createTagTable = (tagdata, targetDiv) => {
    //     //sorting transition이 원활하도록 div 로 셀 구성하는 버전.
    //     console.log(tagdata);

    //     const columns = ['tag', 'count', 'ratio', 'citesum', 'delta']

    //     //table head
    //     d3.select(targetDiv).select('div.thead').selectAll('div.data').data(columns)
    //         .enter().append('div').attr('class', 'data').html(d => d)
    //         .style('left', (d,i) => {return ((i*100) + 'px');});


    //     //table body
    //     let datarows = d3.select(targetDiv).select('div.tbody').selectAll('div.datarow').data(tagdata, d => d.key);
    //     datarows.enter().append('div').attr('class', 'datarow')
    //             .merge(datarows).style('top', (d,i) => {return(40 + (i*40)) + 'px';});
    //     datarows.exit().remove();

    //     let datas = d3.selectAll('div.datarow').selectAll('div.data').data(d => {
    //         return [d.key, d.value.count, d.value.cite];
    //         });
    //     datas.enter().append('div').attr('class', 'data').merge(datas).html(d => d)
    //         .style('left', (d,i,j) => {return (i*100) + 'px';})



    // }

    createSpreadsheet= (topdata, targetDiv, columns) => {
        const div =  d3.select(targetDiv);
        
        const head = div.select('.thead').select('tr').selectAll('th').data(columns);
        head.enter().append('th').merge(head).html(d => d.display)
            .on('click', d => {
                return trs.sort((a,b) => d3.descending(a[d.key],b[d.key]))
            });

        let trs = div.select('tbody').selectAll('tr').data(topdata);
        trs.exit().remove();
        trs = trs.enter().append('tr').merge(trs);

        let tds = trs.selectAll('td').select('div').data(d => {
            return columns.map(col => {
                if(col.display==='info'){
                    return '<title>' + d['title'] + '</title>' + d['tags'].map(tag => '<div class="tag">'+tag+'</div>').join('');
                }
                else if(col.key==='tag'){
                    return '<div class="tag">'+d[col.key]+'</div>';
                }
                else {
                    return d[col.key];
                }
            });
            // if (columns.includes('count')){
            //     return [d['pub_year'], 
            //     '<title>' + d['title'] + '</title>' + d['tags'].map(tag => '<div class="tag">'+tag+'</div>').join(''),
            //     d['max_cite'],
            //     d['count']];
            // }
            
            // return [d['pub_year'], 
            // '<title>' + d['title'] + '</title>' + d['tags'].map(tag => '<div class="tag">'+tag+'</div>').join(''),
            // d['max_cite']];
      
            // return columns.map(key => {
            //     if (key === 'tags') {
            //         return d[key].map(tag => '<div class="tag">'+tag+'</div>');
            //     }
            //     else return d[key];
            // })
        });
        tds.enter().append('td').append('div').attr('class','container').merge(tds)
            .html(d => {
                if (Array.isArray(d)) return d.join('');
                else return d;
            });
    }

    shouldComponentUpdate(nextProps, nextState){
        console.log('dashboard shouldCompunentUpdate');
        if (nextProps !== this.props) {
            return true;
        }
        if (nextState.search_tags !== this.state.search_tags){
            return true;
        }

        return false;
    }

    componentDidMount(){
        console.log("dashboard componentDidMount");
    }

    componentDidUpdate(){
        console.log('dashBoard componentDidUpdate');
        if (this.props.data_p.length > 0) {
            this.makeShowData();
            this.draw();
        }    
    }

    // handleSlider = (props) => {
    //     const { value, dragging, index, ...restProps } = props;
    //     console.log(value, dragging);

    //     if (dragging === false){
    //         this.setState({
    //             'tagpack_n_limit' : value
    //           });
    //     }

    //     return (
    //       <Tooltip
    //         prefixCls="rc-slider-tooltip"
    //         overlay={value}
    //         visible={dragging}
    //         placement="top"
    //         key={index}
    //       >
    //         <Handle value={value} {...restProps} />
    //       </Tooltip>
    //     );
    //   };

    refreshSearchTags = (querytags) => {
        this.setState({
            ...this.state,
            'search_tags' :querytags
        })
    }

    render(){
        return(
            <div className="dashBoard">
                <div className="sessionTitle">
                    <h3 style={{'marginRight':'4px'}}> SESSION OF</h3> 
                    {this.state.search_tags.map((d,i)=> <div className="sessiontag" key={i}>{'#'+d}</div>)} 
                </div>
                {/* <div className="packtitle">
                    <h4 style={{'marginRight':'4px'}}>tags used with</h4> 
                    {this.state.search_tags.map((d,i)=> <div className="tag" key={i}>{d}</div>)}
                </div> */}

                {/* <h4>tags used in this session</h4>  */}
                <PackSection2 data_p={this.props.data_p} search_tags={this.state.search_tags} refreshSearchTags={this.refreshSearchTags}/>

                <h4>session trends</h4>
                <svg id="linechart1">
                    <g className='figures'>
                        <g className='axis x-axis'/>
                        <g className='axis y-axis'> <text className='axis-label'/></g>
                        <path className='line'></path>
                        <g className="circles"></g>
                    </g>
                </svg>
                <svg id="linechart2">
                    <g className='figures'>
                    <g className='axis x-axis'/>
                        <g className='axis y-axis'> <text className='axis-label'/></g>
                        <path className='line'></path>
                        <g className="circles"></g>
                    </g>
                </svg>
                
                <h4 className="showyear">Impact Top papers of {this.showyear}</h4>
                <div id="spreadsheet2" className="table">
                    <div className="tinfo">popular references in this year</div>
                    <div className="thead">
                        <table cellPadding="0" cellSpacing="0" border="0">
                            <thead>
                                <tr>
                                </tr>
                            </thead>
                        </table>
                    </div>
                    <div className="tbody">
                        <table cellPadding="0" cellSpacing="0" border="0">
                            <tbody/>
                        </table>
                    </div>
                </div>

                <div id="spreadsheet1" className="table">
                    <div className="tinfo">popular new papers in this year</div>
                    <div className="thead">
                        <table cellPadding="0" cellSpacing="0" border="0">
                            <thead>
                                <tr>
                                </tr>
                            </thead>
                        </table>
                    </div>
                    <div className="tbody">
                        <table cellPadding="0" cellSpacing="0" border="0">
                            <tbody/>
                        </table>
                    </div>
                </div>

                <div id="tagTable" className="table">
                    <div className="tinfo">impact co-Tags in this year</div>
                    <div className="thead">
                        <table cellPadding="0" cellSpacing="0" border="0">
                            <thead>
                                <tr>
                                </tr>
                            </thead>
                        </table>
                    </div>
                    <div className="tbody">
                        <table cellPadding="0" cellSpacing="0" border="0">
                            <tbody/>
                        </table>
                    </div>
                </div>

            </div>
        );
    }
}

export default DashBoard;
