// node stuff
import React from 'react';
import Select from 'react-select';

// app stuff
import BookingService from '../../../services/BookingService';
import SessionStorage from '../../../utils/SessionStorage';
import Result from './Result';
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
    this.handleDuration = this.handleDuration.bind(this);
    this.handleDate = this.handleDate.bind(this);
    this.handleNote = this.handleNote.bind(this);
  }

  /**
   * Get the default state of the component.
   *
   * @returns {object} The components default state.
   */
  getDefaultState() {
    const dateToday = new Date();

    return {
      selectedOption: null,
      date: dateToday.toISOString().substr(0, 10),
      duration: '',
      note: '',
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
   * Event listener to set the date within the state.
   *
   * @param {Event} event A javascript event object.
   * @returns {void}
   */
  handleDate(event) {
    this.setState({ date: event.target.value });
  }

  /**
   * Event listener to set the duration within the state.
   *
   * @param {Event} event A javascript event object.
   * @returns {void}
   */
  handleDuration(event) {
    this.setState({ duration: event.target.value });
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
   * When the submit button is triggered call the BookingService to save a new
   * booking entry.
   *
   * @returns {void}
   */
  async handleSubmit() {
    const service = new BookingService(SessionStorage.getItem('token'));

    const duration = normalizeDuration(this.state.duration);

    const result = await service.addBooking({
      date: this.state.date,
      duration: duration.toString(),
      activity: this.state.selectedOption.value,
      note: this.state.note
    });

    if (result.status === 'ok') {
      this.setState(this.getDefaultState());
      return;
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
          <input
            type="date"
            id="bookingDate"
            value={this.state.date}
            onChange={this.handleDate}
            className="form-control"
            required
          />
          <br />
          <input
            type="text"
            id="bookingDuration"
            value={this.state.duration}
            onChange={this.handleDuration}
            className="form-control"
            placeholder="duration x:xx e.g. 1:27"
            required
          />
          <br />
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
            id="inputPassword" // bookingNote
            value={this.state.note}
            onChange={this.handleNote}
            className="form-control"
            placeholder="description"
            required
          />
          <br />
          <button
            className="btn btn-outline-success my-2 my-sm-0"
            onClick={this.handleSubmit}
          >
            Book Entry
          </button>
          <Result result={this.state.result}/>
        </div>
      </div>
    );
  }
}

export default Booking;
