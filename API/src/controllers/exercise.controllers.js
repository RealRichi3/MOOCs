/**
 * @fileoverview Exercise controller
 * 
 * @category Backend API
 * @subcategory Controllers
 * 
 * @module Exercise Controller
 * @requires ../models/course.models
 * @requires ../utils/errors
 * 
 * @description This module is responsible for handling all exercise related requests <br>
 * 
 * The following routes are handled by this module:: <br>
 * 
 * </br>
 * 
 * <b>POST</b> /exercise/new <i> - Create a new exercise </i> </br>
 * <b>GET</b> /exercise/ <i> - Get all exercises </i> </br>
 * <b>GET</b> /exercise/:id <i> - Get a particular exercise </i> </br>
 * <b>PATCH</b> /exercise/update/:id <i> - Update a particular exercise </i> </br>
 * <b>DELETE</b> /exercise/delete/:id <i> - Delete a particular exercise </i> </br>
 * <b>POST</b> /exercise/score <i> - Grade or score a particular exercise </i> </br>
 * <b>GET</b> /exercise/submission/:id <i> - Get a particular exercise submission </i> </br>
 * <b>GET</b> /exercise/submission/prev/:exerciseId <i> - Get previous submissions for a particular exercise </i> </br>
 */

const { Question, Exercise, ExerciseSubmission, CourseReport, CourseSection, ExerciseReport } = require("../models/course.models")
const { BadRequestError, NotFoundError, ForbiddenError } = require("../utils/errors");
const { issueCertificate } = require("./certificate.controllers");

// Create a new exercise
/**
 * Create new exercise
 * 
 * @param {string} title - Exercise title
 * @param {string} description - Exercise description
 * @param {string} course_id - Course id
 * @param {string} course_section_id - Course section id
 * @param {string} duration - Course duration in time
 * 
 * @returns {MongooseObject} saved_exercise
 * 
 * @throws {error} if an error occured
 * @throws {NotFoundError} if course_id provided and it doesn't match any course in DB
 */
exports.createExercise = async (req, res, next) => {
    const { title, description, duration, course_id, course_section_id } = req.body

    // Check if all required fields are provided
    if (!title || !description || !duration || !course_id || !course_section_id) {
        return next(new BadRequestError('Please provide all required fields'))
    }

    let course_section = await CourseSection.findById(course_section_id).populate('course')
    if (!course_section) {
        return next(new NotFoundError('Course section not found'))
    }

    // Check if course section belongs to the course provided
    if (course_section.course._id.toString() !== course_id) {
        return next(new ForbiddenError('Course section does not belong to the course provided'))
    }

    // Check if course is available
    if (!course_section.course.isAvailable) {
        return next(new ForbiddenError('Course is not available'))
    }

    const saved_exercise = await Exercise.create({
        title, description, duration, course: course_section.course._id,
        course_section: course_section._id
    });

    return res.status(200).json({
        success: true,
        data: {
            exercise: await saved_exercise.populate({
                path: 'course_section',
                populate: {
                    path: 'course exercises videos'
                }
            })
        }
    });
}


// Get exercises for a particular course - req.body.course_id = the id of the course you want to get exercises for
// Get exercises for all courses - req.body = {} // empty
// Get data for a particular exercise - req.body._id = exercise._id
/**
 * Get Exercises
 * 
 * @description 
 * By default it gets all available exercises, 
 * if req.body is provided it'll be used as query params
 * to make a more streamlined query result
 * 
 * @param {string} course_id - Course id
 * @param {string} _id - Exercise id
 * @param {string} title - Exercise title
 * @param {string} description - Exercise description
 * @param {string} duration - Exercise duration
 * 
 * @returns {ArrayObject} exercises
 * 
 * @throws {error} if an error occured
 */
exports.getExercises = async (req, res, next) => {
    let exercises;
    // If any specific query was added 
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('req.body', req.body)
        exercises = await Exercise.find(req.body)
    }

    // Sort the exercises according to how they where added
    exercises = !exercises ? await Exercise.find().populate('questions') : exercises

    // Get only the available courses
    const available_exercises = exercises.filter((exercise) => exercise.toJSON() )

    return res.status(200).json({
        success: true,
        data: {
            exercises: available_exercises
        }
    });
}

/**
 * Get exercise data
 * 
 * @param {string} id - id of the exercise 
 * 
 * @returns {Object} exercise 
 * 
 * @throws {BadRequestError} if missing required param in request
 * @throws {NotFoundError} if exercise not found
 * 
 * @see {@link module:CourseModel~exerciseSchema}
 */
exports.getExerciseData = async (req, res, next) => {
    const exercise_id = req.params.id

    if (!exercise_id || exercise_id == ':id') {
        return next(new BadRequestError('Missing param `id` in request params'))
    }

    let exercise = await Exercise.findById(exercise_id).populate('questions')

    if (!exercise) {
        return next(new NotFoundError("Exercise not found"));
    }

    exercise = exercise.toObject()
    console.log(req.user)
    const exercise_report = await ExerciseReport.findOne({ exercise: exercise._id, user: req.user.id })
    console.log(exercise_report)
    exercise.percentage_passed = exercise_report ? exercise_report.percentage_passed : undefined

    return res.status(200).send({
        success: true,
        data: {
            exercise
        }
    })
}

// Update data for a particular exercise
/**
 * Update exercise data
 * 
 * @description This function updates the exercise data,
 * it doesn't update the questions, to update the questions
 * 
 * use {@link module:QuestionController~Questions}
 * @see {@link module:CourseController~updateExerciseQuestions}
 * 
 * @param {string} id - id of exercise
 * 
 * @returns {string} message
 * @returns {object} exercise
 * 
 * @throws {error} if an error occured
 * @throws {NotFoundError} if exercise not found
 */
exports.updateExercise = async (req, res, next) => {
    const exercise_id = req.params.id

    if (!exercise_id || exercise_id == ':id') {
        return next(new BadRequestError('Missing param `id` in request params'))
    }

    const exercise = await Exercise.findByIdAndUpdate(
        exercise_id,
        { $set: req.body },
        { new: true }
    );

    if (!exercise) {
        return next(new NotFoundError("Exercise not found"));
    }

    return res.status(200).json({
        success: true,
        data: {
            message: "Exercise Updated",
            exercise
        }
    });
}


// Delete a particular exercise
/**
 * Delete exercise
 * 
 * Doesn't literally delete the exercise, it only
 * makes it unavailable
 * 
 * @param {string} id - id of exercise
 * 
 * @throws {error} if an error occured
 * @throws {NotFoundError} if exercise not found
 * */
exports.deleteExercise = async (req, res, next) => {
    const exercise_id = req.params.id

    if (!exercise_id || exercise_id == ':id') {
        return next(new BadRequestError('Missing param `id` in request params'))
    }

    // Make exercise unavailable
    await Exercise.findByIdAndUpdate(exercise_id, { isAvailable: false })

    return res.status(200).send({
        success: true,
        data: {
            message: "Exercise deleted successfully"
        }
    })
}


// Add a question to an exercise
/**
 * Add question to exercise
 * 
 * @description This function adds a question to an exercise.
 * 
 * @param {string} exercise_id
 * @param {string} question_id
 * 
 * @returns {string} message
 * 
 * @throws {error} if an error occured
 * @throws {NotFoundError} if Exercise not found
 * @throws {NotFoundError} if Question not found
 * */
exports.addQuestionToExercise = async (req, res, next) => {
    const { exercise_id, question_id } = req.body

    if (!exercise_id || !question_id) {
        return next(new BadRequestError('Missing required param in request body'))
    }

    const exercise = await Exercise.findById(exercise_id)

    if (!exercise) {
        return next(new NotFoundError("Exercise not found"))
    }

    const question = await Question.findByIdAndUpdate(question_id, { exercise: exercise_id })
    if (!question) {
        return next(new NotFoundError("Question not found"))
    }

    return res.status(200).send({
        success: true,
        data: {
            message: "Question has been added to exercise",
            question
        }
    })
}


// Remove a question from an exercise
/**
 * Remove question from exercise
 * 
 * @param {string} question_id
 * 
 * @returns {string} message
 * 
 * @throws {NotFoundError} if Questin not found
 * @throws {error} if an error occured
 * */
exports.removeQuestionFromExercise = async (req, res, next) => {
    const { question_id } = req.body

    const question = await Question.findByIdAndUpdate(question_id, { exercise: null })
    if (!question) {
        return next(new NotFoundError("Question not found"))
    }

    return res.status(200).send({
        success: true,
        data: {
            message: "Question has been removed from exercise",
            question
        }
    })
}


/**
 * Score anwers
 * 
 * @description Score answers for a particular exercise,
 * this function is called when a student submits an exercise for grading,
 * it returns the score and the report for the exercise, the report contains
 * the exercise id, the user id, the score and the submission.
 * 
 * <br>
 * <br>
 * 
 * The submission is saved to the database so the user can view all his submissions 
 * for a particular exercise.
 * 
 * @param {string} id - exercise id
 * @param {Object} submission Object where keys are question_id's and values are selected option
 * 
 * @returns {Object} report
 * @returns {string} report.exercise report.user report.score submission
 * 
 * @throws {error} if an error occured
 */
exports.scoreExercise = async (req, res, next) => {
    const exercise_id = req.params.id;

    if (!exercise_id || exercise_id == ":id") {
        return next(new BadRequestError("Missing param `id` in request params"));
    }

    const students_submission = req.body.submission;
    if (!students_submission) {
        return next(
            new BadRequestError("Missing required param `submission` in request body")
        );
    }

    // Check if exercise exists
    const exercise_doc = await Exercise.findById(exercise_id).populate({
        path: "questions",
        select: "correct_option",
    });
    if (!exercise_doc) {
        return next(new NotFoundError("Exercise not found"));
    }

    // Check if user has enrolled for course
    const { course } = (await exercise_doc.populate({
        path: 'course',
        populate: {
            path: "exercises"
        }
    }));
    if (!course.enrolled_users.includes(req.user.id)) {
        return next(new ForbiddenError("User hasn't enrolled for course"));
    }

    const exercise = exercise_doc.toJSON();
    let score = 0;
    let exercise_submission = new ExerciseSubmission({
        user: req.user.id,
        exercise: exercise._id,
    });

    // Grade users submission
    exercise.questions.forEach((question) => {
        const submitted_option = students_submission[question._id.toString()];

        // Check if submitted option is correct. If yes, increment score
        if (question.correct_option == submitted_option) score++;
        exercise_submission.submission.push({
            question: question._id,
            submitted_option: submitted_option,
        });
    });

    let course_report_query = CourseReport.findOne(
        { user: req.user.id, course: course._id },
    )
    let course_report = await course_report_query.exec();

    let exercise_report = await ExerciseReport.findOneAndUpdate(
        { user: req.user.id, exercise: exercise_doc._id },
        { course_report: course_report._id },
        { new: true, upsert: true })

    exercise_report.best_score = Math.max(exercise_report.best_score, score)
    exercise_report = await exercise_report.save()

    exercise_submission.score = score;
    exercise_submission.report = exercise_report._id;
    exercise_submission = await exercise_submission.save();
    exercise_submission = await exercise_submission.populate(
        "submission.question"
    );

    // Update best score in course report
    course_report = await course_report.updateBestScore()

    // Issue certificate if user has completed course
    let certificate = course_report.isCompleted
        ? await issueCertificate(course_report._id)
        : null;

    return res.status(200).send({
        success: true,
        data: {
            report: {
                ...exercise_submission.toObject(),
                percentage_passed: exercise_submission.percentage_passed,
                best_score: exercise_report.best_score,
                best_percentage_passed: exercise_report.percentage_passed,
                course_progress: course_report.percentage_passed
            },
            certificate,
        },
    });
}

/**
 * Get previous submissions for exercise
 * 
 * @description Get result for previously submitted exercises,
 * it all the previously submissions for a particular exercise.
 * 
 * @param {string} exerciseId - id of the exercise
 * 
 * @throws {NotFoundError} if Exercise not found
 * @throws {BadRequestError} if exerciseId not provided in request params
 * 
 * @returns {MongooseObject} submission
 */
exports.getPreviousSubmissionsForExercise = async (req, res, next) => {
    const exercise_id = req.params.exerciseId

    if (!exercise_id || exercise_id == ':exerciseId') {
        return next(new BadRequestError('Missing param `id` in request params'))
    }

    const exercise = await Exercise.findById(exercise_id)
    if (!exercise) {
        return next(new NotFoundError('Exercise not found'))
    }

    const exercise_submissions = await ExerciseSubmission.find(
        { exercise: exercise._id, user: req.user.id }).populate('submission.question')

    return res.status(200).send({
        success: true,
        data: {
            submissions: exercise_submissions
        }
    })
}

/**
 * Get submission data
 * 
 * @description get data for ealier submitted quiz 
 * 
 * @param {string} id - id of exercise submission
 * 
 * @throws {BadRequestError} if submission id not in request param
 * @throws {NotFoundError} if Submission not found
 * @throws {ForbiddenError} if user didn't make submission earlier
 * 
 * @return {Object} submission
 */
exports.getSubmissionData = async (req, res, next) => {
    const submitted_quiz_id = req.params.id;

    // Check for required parameters
    if (!submitted_quiz_id || submitted_quiz_id == ":id") {
        return next(new BadRequestError("Missing param `id` in request params"));
    }

    const submission = await ExerciseSubmission.findById(
        submitted_quiz_id
    ).populate("submission.question");

    // Check if submission record exists
    if (!submission) {
        return next(new NotFoundError('Submission not found'))
    }

    // Check if initial exercise submission was made by user
    if (submission.user.toString() != req.user.id) {
        return next(new ForbiddenError("Submission doesn't belong to user"))
    }

    return res.status(200).send({
        success: true,
        data: {
            submission
        }
    })
}