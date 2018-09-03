// node stuff
import React from 'react';
import Select from 'react-select';

// app stuff
import BookingService from '../../../services/BookingService';
import SessionStorage from '../../../utils/SessionStorage';
import ShowResult from './Result';
import StopWatch from './StopWatch';
import { normalizeDuration } from '../../../utils/timeFormat';

/**
 * React Booking component.
 */
class Booking extends React.Component {
  /**
   * Initializes the properties of the component.
   *
   * @param {object} props A JSON object with the properties for this component.
   */
  constructor(props) {
    super(props);
    this.state = this.getDefaultState();
    this.handlePackageChange = this.handlePackageChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleNote = this.handleNote.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.StopWatch = React.createRef();
  }

  /**
   * Get the default state of the component.
   *
   * @returns {object} The components default state.
   */
  getDefaultState() {
    return {
      selectedOption: null,
      clicked: false,
      display: 'none',
      StartDisplay: 'block',
      StopDisplay: 'none',
      note: '',
      duration: 0,
      result: ''
    };
  }

  /**
   * Save the selected option within the components state.
   *
   * @param {string} selectedOption The selected option.
   * @returns {void}
   */
  handlePackageChange(selectedOption) {
    this.setState({ selectedOption });
  }

  /**
   * Event listener to set the note (description) within the state.
   *
   * @param {Event} event A javascript event object.
   * @returns {void}
   */
  handleNote(event) {
    this.setState({ note: event.target.value });
  }

  /**
   * Save the duration on click.
   *
   * @param {string} time A time string.
   * @returns {void}
   */
  handleClick(time) {
    this.setState({ duration: time});
  }

  /**
   * Remove the booking result.
   *
   * @returns {void}
   */
  removeResults() {
    this.setState({ result: '' });
  }

  /**
   * When the submit button is triggered call the BookingService to save a new
   * booking entry.
   *
   * @returns {void}
   */
  async handleSubmit() {
    const service = new BookingService(SessionStorage.getItem('token'));

    const today = new Date();
    let formattedDate = today.toISOString().substr(0, 10);
    let duration = normalizeDuration(this.state.duration);

    const result = await service.addBooking({
      date: formattedDate,
      duration: duration.toString(),
      activity: this.state.selectedOption.value,
      note: this.state.note
    });

    if (result.status === 'ok') {
      this.setState(this.getDefaultState());
      this.StopWatch.current.reset();
    }

    this.setState({result: result});
  }

  /**
   * Render everything.
   */
  render() {
    const { selectedOption } = this.state;
    let options = SessionStorage.getItem('options');

    if (!options) {
      options = [];
    }

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
            options={options.map(item => {
              return { value: item.jobNumber, label: item.jobName };
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
          <StopWatch
            ref={this.StopWatch}
            handleClick={this.handleClick.bind(this)}
            removeResults={this.removeResults.bind(this)}
          />
          <button
            className="btn btn-outline-success my-2 my-sm-0"
            onClick={this.handleSubmit}
          >
            Book Entry
          </button>
          <ShowResult result={this.state.result}/>
        </div>
      </div>
    );
  }
}

export default Booking;
