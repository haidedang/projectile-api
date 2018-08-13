import React from 'react';
import Select from 'react-select';
import './Booking.css';
import { FaPlayCircle, FaStopCircle } from 'react-icons/fa';
import { IconContext } from 'react-icons';
import getSelectOptions from '../../../reducers';
import StopWatch from './StopWatch';
import ApiCaller from '../../../services/ApiCaller';
import { normalizeDuration } from '../../../utils/timeFormat';

function getDefaultState() {
  return {
    selectedOption: null,
    clicked: false,
    display: 'none',
    StartDisplay: 'block',
    StopDisplay: 'none',
    note: '',
    duration: ''
  };
}

class Booking extends React.Component {
  state = getDefaultState();

  constructor(props) {
    super(props);
    this.handlePackageChange = this.handlePackageChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleNote = this.handleNote.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  handlePackageChange(selectedOption) {
    this.setState({ selectedOption });
    console.log(`Option selected:`, selectedOption);
  }

  handleNote(event) {
    this.setState({ note: event.target.value });
  }

  async handleSubmit() {
    const api = new ApiCaller(sessionStorage.token);

    const today = new Date();
    let formattedDate = today.toISOString().substr(0, 10);
    let duration = normalizeDuration(this.state.duration);

    console.log(
      formattedDate,
      this.state.selectedOption.value,
      this.state.note,
      this.state.duration
    );

    let res = await api.callApi('book', 'POST', {
      date: formattedDate,
      duration: duration,
      activity: this.state.selectedOption.value,
      note: this.state.note
    });

    console.log(res);
    getDefaultState();
  }

  handleClick(time) {
    this.setState({ duration: time }, () => {
      console.log(this.state);
    });
  }

  render() {
    const { selectedOption } = this.state;

    //TODO: There must be another way to update the freaking state
    if (sessionStorage.options) {
      const { duration } = this.state;
      return (
        <div className="container">
          <div className="card card-container">
            <h2>Booking</h2>
            <p id="profile-name" className="profile-name-card" />
            <span id="reauth-email" className="reauth-email" />
            <Select
              placeholder="Select Package"
              value={selectedOption}
              onChange={this.handlePackageChange}
              options={JSON.parse(sessionStorage.options).map(item => {
                return { value: item.no, label: item.name };
              })}
            />
            <br />
            <input
              type="text"
              id="inputPassword"
              value={this.state.note}
              onChange={this.handleNote}
              className="form-control"
              placeholder="description"
              required
            />
            <br />
            <StopWatch handleClick={this.handleClick.bind(this)} />
            <button
              className="btn btn-outline-success my-2 my-sm-0"
              onClick={this.handleSubmit}
            >
              Book Entry
            </button>
          </div>
        </div>
      );
    } else return null;
  }
}

export default Booking;
