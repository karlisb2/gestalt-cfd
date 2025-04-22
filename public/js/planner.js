const tasks = [] // Track tasks locally
let editingIndex = null // Track task in edit

$(document).ready(function () {
    loadTasks()

    if (window.location.hash === "#new") {
        toggleForm(true)
    }
})

// Fetch tasks from the server on page load
function loadTasks() {
    $.ajax({
        url: '/api/tasks',
        method: 'GET',
        dataType: 'json',
        success: function (serverTasks) {
            // Replace the local tasks array with the tasks from the server
            tasks.splice(0, tasks.length, ...serverTasks)
            displayTasks()
        },
        error: function () {
            console.error("Failed to fetch tasks")
        }
    })
}

// Display tasks in the list
function displayTasks() {
    const $tasksList = $('#tasksList')
    $tasksList.empty() // Clear existing tasks

    tasks.forEach((task, index) => {
        const description = task.description || 'No description provided'
        const taskHtml =`
            <div class="task">
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">${task.time} - ${task.title}</h5>
                        <p class="card-text">${description}</p>
                        <button class="btn btn-secondary btn-sm" onclick="editTask(${index})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteTask(${index})">Delete</button>
                    </div>
                </div>
            </div>
        `
        $tasksList.append(taskHtml)
    })
}


// Add or Update a task (with an API call)
$('#plannerForm').on('submit', function (e) {
    e.preventDefault()

    const taskTime = $('#taskTime').val()
    const taskTitle = $('#taskTitle').val()
    const taskDescription = $('#taskDescription').val()

    if (!taskTime || !taskTitle) {
        return
    }

    const payload = {
        time: taskTime,
        title: taskTitle,
        description: taskDescription,
    }

    if (editingIndex === null) {
        // Create new
        $.ajax({
            url: '/api/tasks',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            dataType: 'json',
            success: function (newTask) {
                tasks.push(newTask)
                displayTasks()
                $('#plannerForm')[0].reset()
                toggleForm(false)
            },
            error: function (xhr) {
                const err = xhr.responseJSON
                alert(err?.message || 'Something went wrong!')
            }
        })
    } else {
        // Update existing
        const taskId = tasks[editingIndex].id
        $.ajax({
            url: `/api/tasks/${taskId}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(payload),
            dataType: 'json',
            success: function (updatedTask) {
                // Replace old
                tasks[editingIndex] = updatedTask
                displayTasks()
                $('#plannerForm')[0].reset()
                toggleForm(false)
                editingIndex = null
            },
            error: function (xhr) {
                const err = xhr.responseJSON
                alert(err?.message || 'Failed to update task')
            }
        })
    }
})

// Edit task
function editTask(index) {
    const task = tasks[index]
    editingIndex = index

    $('#taskTime').val(task.time)
    $('#taskTitle').val(task.title)
    $('#taskDescription').val(task.description)

    toggleForm(true)
}

// Delete task
function deleteTask(index) {
    const taskId = tasks[index].id

    $.ajax({
        url: `/api/tasks/${taskId}`,
        method: 'DELETE',
        dataType: 'json',
        success: function () {
            tasks.splice(index, 1)
            displayTasks()
        },
        error: function (xhr) {
            const err = xhr.responseJSON
            alert(err?.message || 'Failed to delete task')
        }
    })
}

// Show/hide form
function toggleForm(show) {
    if (show) {
        $('#newTaskForm').show()
        $('#tasksList').hide()
    } else {
        $('#newTaskForm').hide()
        $('#tasksList').show()
    }
}

// "Create New Task" buttons
$('#desktopCreateNewTaskBtn, #mobileCreateNewTaskBtn, #plannerCreateNewTaskBtn')
  .on('click', function () {
    editingIndex = null    // ensure we’re in “new” mode
    $('#plannerForm')[0].reset()
    toggleForm(true)
  })

// "Cancel" button
$('#cancelBtn').on('click', function () {
    toggleForm(false)
    editingIndex = null
    $('#plannerForm')[0].reset()
})
