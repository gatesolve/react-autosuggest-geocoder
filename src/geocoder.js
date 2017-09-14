
import * as _ from 'lodash';
import React from 'react';
import { stringify } from 'qs';
import fetch from 'node-fetch';

import Autosuggest from 'react-autosuggest';

export class ReactAutosuggestGeocoder extends React.Component {
  static propTypes = {
    url: React.PropTypes.string.isRequired,
    sources: React.PropTypes.string.isRequired,
    apiKey: React.PropTypes.string.isRequired,
    fetchDelay: React.PropTypes.number.isRequired,
    center: React.PropTypes.shape({
      latitude: React.PropTypes.number.isRequired,
      longitude: React.PropTypes.number.isRequired
    }),
    bounds: React.PropTypes.array,

    onSuggestionSelected: React.PropTypes.func,
    onReverseSelected: React.PropTypes.func,
    getSuggestionValue: React.PropTypes.func.isRequired,
    renderSuggestion: React.PropTypes.func.isRequired
  };

  static defaultProps = {
    url: 'https://search.mapzen.com/v1',
    sources: 'openaddresses',
    apiKey: null,
    fetchDelay: 150,
    center: null,
    bounds: null,

    onReverseSelected: () => {},
    getSuggestionValue: suggestion => suggestion.properties.label,
    renderSuggestion: suggestion => (
      <div className='autosuggest-item'>
        {suggestion.properties.label}
      </div>
    )
  };

  constructor (props) {
    super(props);

    this.state = {
      value: '',
      suggestions: [],
      selected: false
    };

    this._onSuggestionsFetchRequested = _.debounce(this.onSuggestionsFetchRequested, this.props.fetchDelay);
  }

  componentDidMount () {
    this.input = this.autosuggest.input;
  }

  reverse (center, bounds) {
    const url = this.props.url + '/reverse';
    const data = {
      api_key: this.props.apiKey,
      layers: 'address',
      size: 1
    };
    if (center) {
      data['point.lat'] = center.latitude;
      data['point.lon'] = center.longitude;
    }
    if (bounds) {
      data['boundary.rect.min_lon'] = bounds[0];
      data['boundary.rect.min_lat'] = bounds[1];
      data['boundary.rect.max_lon'] = bounds[2];
      data['boundary.rect.max_lat'] = bounds[3];
    }
    return fetch(url + '?' + stringify(data), {
      method: 'get',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(response => response.json());
  }

  search (text) {
    const url = this.props.url + '/search';
    return fetch(url + '?' + stringify({
      api_key: this.props.apiKey,
      sources: this.props.sources,
      text: text
    }), {
      method: 'get',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(response => response.json());
  }

  autocomplete (text) {
    const url = this.props.url + '/autocomplete';
    const data = {
      api_key: this.props.apiKey,
      sources: this.props.sources,
      text: text
    };
    if (this.props.center) {
      data['focus.point.lat'] = this.props.center.latitude;
      data['focus.point.lon'] = this.props.center.longitude;
    }
    if (this.props.bounds) {
      data['boundary.rect.min_lon'] = this.props.bounds[0];
      data['boundary.rect.min_lat'] = this.props.bounds[1];
      data['boundary.rect.max_lon'] = this.props.bounds[2];
      data['boundary.rect.max_lat'] = this.props.bounds[3];
    }
    return fetch(url + '?' + stringify(data), {
      method: 'get',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(response => response.json());
  }

  reverseGeocode = (point) => {
    let { latitude, longitude } = point || this.props.center || {};

    return this.reverse({ latitude, longitude }).then((data) => {
      if (data.features.length > 0) {
        this.setState({
          selected: true,
          value: data.features[0].properties.label
        });

        if (this.props.onReverseSelected) {
          return this.props.onReverseSelected({ search: data });
        }
      }
    });
  }

  blur = () => {
    this.input.blur();
  }

  focus = () => {
    this.input.focus();
  }

  update = (newValue) => {
    this.setState({
      value: newValue,
      selected: false
    });
  }

  clear = () => {
    this.setState({
      value: '',
      selected: false
    });
  }

  onChange = (event, { newValue }) => {
    this.setState({
      value: newValue,
      selected: false
    });
  };

  onSuggestionsFetchRequested = ({ value }) => {
    return this.autocomplete(value).then((data) => {
      this.setState({
        suggestions: _.uniqBy(data.features, (feature) => {
          return feature.properties.label;
        })
      });
    });
  };

  onSuggestionsClearRequested = () => {
    this.setState({
      suggestions: []
    });
  };

  onSuggestionSelected = (event, { suggestion, suggestionValue, suggestionIndex, sectionIndex, method }) => {
    return this.search(suggestionValue).then((data) => {
      this.setState({
        selected: true,
        value: suggestionValue
      });

      if (this.props.onSuggestionSelected) {
        return this.props.onSuggestionSelected(event, { search: data, suggestion, suggestionValue, suggestionIndex, sectionIndex, method });
      }
    });
  };

  render () {
    const { suggestions, value } = this.state;
    const {
      inputProps,
      onSuggestionsFetchRequested,
      onSuggestionsClearRequested,
      onSuggestionSelected,
      fetchDelay,
      ...props
    } = this.props;
    const { onFocus, onBlur, ...restOfInputProps } = (inputProps || {});

    return (
      <Autosuggest
        suggestions={suggestions}
        onSuggestionsFetchRequested={this._onSuggestionsFetchRequested}
        onSuggestionsClearRequested={this.onSuggestionsClearRequested}
        onSuggestionSelected={this.onSuggestionSelected}
        inputProps={_.defaults(restOfInputProps || {}, {
          value: value,
          onChange: this.onChange,
          onFocus: e => _.isFunction(onFocus) ? onFocus(e) : undefined,
          onBlur: e => _.isFunction(onBlur) ? onBlur(e) : undefined
        })}
        ref={(autosuggestRef) => {
          if (autosuggestRef !== null) {
            this.autosuggest = autosuggestRef;
          }
        }}
        {...props}
      />
    );
  }
}
