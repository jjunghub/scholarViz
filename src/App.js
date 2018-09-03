import React, { Component } from 'react';
import './App.css';
import  * as d3 from 'd3';
import Graph from './components/Graph';
import DashBoard from './components/DashBoard';

class App extends Component {
  state = {
    'data_p' : [],
    'data_l' : [],
    'pids_citeTop' : [],
    'pids_referTop_recent' : [],
    'search_tags' : ['natural language processing']//['feature extraction']
    // 'search_tags' : ['recognition']//['feature extraction']
    // 'search_tags' : ['internet of things (iot)']//['feature extraction']
    // 'search_tags' : ['feature extraction']
  };

  getDataset = async () => {
    try {
      const data = await Promise.all([
        require('./data/visual_p_nlp.json'),
        require('./data/visual_l_nlp.json')
      ]);

      console.log(this.state.data_p.length);
      console.log('set dataset!');

      this.setState({
        'data_p' : data[0],
        // 'data_l' : []
        'data_l' : data[1]
      });

      console.log(this.state.data_p.length);

      console.log('successfully set dataset!');
      console.log("총 데이터 수 : ", this.state.data_p.length, this.state.data_l.length);

      // this.impactData();
    } catch (e) {
      console.log(e);
    }
  }

  impactData = () => {
    const papers = this.state.data_p;
    const links = this.state.data_l;

    const year = d3.extent(papers, d => d.pub_year);
    console.log(year);

    // 각 년도별 인용수 TOP3 논문들
    const n = 1;
    const citelimit = 500;

    const data = papers.map(d => ({
      'p_id' : d.p_id,
      'pub_year' : d.pub_year,
      'max_cite' : d.max_cite
    })).sort((a,b) => d3.descending(a.max_cite,b.max_cite));

    let pids_citeTop = [];

    const g = d3.nest().key(d => d.pub_year)
                .entries(data);

    g.forEach((d) => {
      pids_citeTop = pids_citeTop.concat(d.values.slice(0,n)
                            .map(d => d.p_id));
    });

    g.forEach((d) => {
      pids_citeTop = pids_citeTop.concat(d.values.filter(d => d.max_cite>citelimit)
                            .map(d => d.p_id));
    });
    console.log(pids_citeTop);

    //최근 논문들에 의해 많이 인용되고 있는 논문 
    const year_recent = 2018 - 3;
    const top_n = 5;
    const count_limit = 10;

    let pids_referTop_recent = [];
    g.filter(d => d.key > year_recent)
      .forEach(d => {
        let pids_year = d.values.map(dd => dd.p_id);
        // console.log(p_ids_year);

        // let cited_pids = links.filter(d => pids_year.includes(d.citedby)).map(d => ({'p_id' : d.p_id}));
        // console.log(d3.nest().key(d => d.p_id).entries(cited_pids));

        let cited_pids = links.filter(d => pids_year.includes(d.citedby)).map(d => d.p_id);
        let top_in_a_year = d3.nest().key(d => d).rollup(d => ({'count' : d.length})).entries(cited_pids)
          .filter(d => d.value.count > count_limit)
          .sort((a, b) => d3.descending(a.value.count, b.value.count))
          .slice(0, top_n)
          .map(d => +d.key);

        pids_referTop_recent = pids_referTop_recent.concat(top_in_a_year);
      });
    console.log(pids_referTop_recent);

    pids_referTop_recent = d3.set(pids_referTop_recent).values().map(d => +d);
    console.log(pids_referTop_recent);


    // const all = pids_citeTop.concat(pids_referTop_recent)
    // console.log(all);
    // console.log(d3.set(all).values());

    this.setState({
      'pids_citeTop' : pids_citeTop,
      'pids_referTop_recent' : pids_referTop_recent
    });
  }

  componentDidMount() {
    console.log("app component did mount");
    this.getDataset();
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    console.log("app shouldComponentUpdate");
    console.log(this.state, nextState);
    return true;
  }

  componentDidUpdate(){
    console.log("app coponentDidUpdate");
  }

  render() {
    const{data_p, data_l, pids_citeTop, pids_referTop_recent, search_tags} = this.state;
    return (
      <div className="App">
        <header className="App-header">
           <h1 className="App-title">WHAT WE CAN DO WITH DATA & VIZ.</h1>
        </header>

        <DashBoard data_p = {data_p} data_l = {data_l} search_tags = {search_tags}/>

        {/* <div> 
          <h4>High Impact Papers in this session</h4>
          <Graph data_p = {data_p} data_l = {data_l} pids_top_a = {pids_citeTop} 
            pids_top_b = {pids_referTop_recent} size={[100,100]} />
        </div> */}
      </div>
    );
  }
}

export default App;
