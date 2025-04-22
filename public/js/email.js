async function sendEmail(event) {
    event.preventDefault()

    const to = document.getElementById("to").value
    const subject = document.getElementById("subject").value
    const message = document.getElementById("message").value

    const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, message })
    })

    const result = await response.json()
    alert(result.success || result.error)
}
