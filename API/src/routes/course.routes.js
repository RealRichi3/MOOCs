
const router = require("express").Router();

const { createCourse, getCourses, getCourseData,
    deleteCourse, updateCourse,
    uploadVideo, getVideoData, getCourseVideos,
    updateVideo, enrollCourse, cancelEnrollment,
    getEnrolledCourses, getEnrolledUsers,
    deleteVideo,
    getStudentReportForCourse } = require("../controllers/course.controllers")

const {
    getDownloadableResources,
    getDownloadableResourceData,
    deleteDownloadableResource,
    updateDownloadableResource,
    uploadDownloadableResource,
    createDownloadableResource
} = require('../controllers/downloadableresources.controllers')

const multer = require('multer')
const storage = multer.diskStorage({
    destination: 'src/assets/tempfiles/',
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

const permit = require("../middlewares/permission_handler")
const { basicAuth } = require("../middlewares/auth")


router
    .get('/downloadableresource', basicAuth(), permit("Admin EndUser SuperAdmin"), getDownloadableResources)
    .get('/downloadableresource/get-data/:id', basicAuth(), permit("Admin EndUser SuperAdmin"), getDownloadableResourceData)
    .get("/:id", basicAuth('access'), getCourseData)

router.use(basicAuth())

router.get("/:id", basicAuth('optional'), getCourseData)

router.use(basicAuth())
router
    .post("/new", permit("Admin SuperAdmin"), upload.single('file'), createCourse)
    .patch("/update/:id", permit("Admin SuperAdmin"), updateCourse)
    .delete("/delete/:id", permit("Admin SuperAdmin"), deleteCourse)
    .post("/enroll/:id", permit("Admin EndUser SuperAdmin"), enrollCourse)
    .post("/cancelenrollment/:id", permit("Admin EndUser SuperAdmin"), cancelEnrollment)
    .get("/enrolled", permit("Admin EndUser SuperAdmin"), getEnrolledCourses)
    .get("/enrolledcourses", permit("Admin EndUser SuperAdmin"), getEnrolledCourses)
    .get("/enrolledusers/:id", permit("Admin EndUser SuperAdmin"), getEnrolledUsers)
    .get("/", permit("Admin EndUser SuperAdmin"), getCourses)

router
    .post("/video/upload", permit("Admin SuperAdmin"), uploadVideo)
    .get("/video/:id", permit("Admin EndUser SuperAdmin"), getVideoData)
    .get("/videos/:courseId", permit("Admin EndUser SuperAdmin"), getCourseVideos)
    .patch("/video/update/:id", permit("Admin SuperAdmin"), updateVideo)
    .delete("/video/delete/:videoId", permit("Admin SuperAdmin"), deleteVideo)

router
    .post('/downloadableresource/new', permit("Admin SuperAdmin"), createDownloadableResource)
    .post('/downloadableresource/upload', permit("Admin SuperAdmin"), upload.single('file'), uploadDownloadableResource)
    .patch('/downloadableresource/update/:id', permit("Admin SuperAdmin"), updateDownloadableResource)
    .delete('/downloadableresource/delete/:id', permit("Admin SuperAdmin"), deleteDownloadableResource)

router.get('/studentreport/:id', permit("Admin SuperAdmin"), getStudentReportForCourse)

module.exports = router
