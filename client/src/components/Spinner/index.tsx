import "./spinner.scss";
import PropTypes from "prop-types";
interface ISpinnerProps {
  height: string;
  width: string;
  color: string;
}

/**
 * @category Client App
 * @subcategory Component
 * @module Spinner
 * @description This module contains the components in the frontend,
 * @component
 * @example
 * <Spinner width="30px" height="30px" color="#fff" />
 * */

const index = ({ width, height, color }: ISpinnerProps) => {
  return (
    <div aria-label="loading" className="spinner">
      <div
        style={{ width: width, height: height, borderColor: color }}
        className="spinner__animate"
      />
    </div>
  );
};

index.propTypes = {
  height: PropTypes.string.isRequired,
  width: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
};
export default index;
