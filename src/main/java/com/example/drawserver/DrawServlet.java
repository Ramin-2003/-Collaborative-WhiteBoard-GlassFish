package com.example.drawchatserver;

import java.io.*;

import jakarta.servlet.http.*;
import jakarta.servlet.annotation.*;
import org.json.JSONObject;

@WebServlet(name = "drawServlet", value = "/draw-servlet/*")
public class DrawServlet extends HttpServlet {
    public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
        System.out.println("Getting");
        response.setContentType("text/plain");
        String pathInfo = request.getPathInfo(); // path info will be room code
        String roomCode = pathInfo.substring(1, pathInfo.length());

        PrintWriter out = response.getWriter();
        if (DrawServer.rooms.containsKey(roomCode)) { // returns true if room exists
            out.println("true");
        }
        else { // returns false if room does not exist
            out.println("false");
        }

    }

    public void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
        // post method for receiving username and adding it to the appropriate room
        System.out.println("Posting");
        // parsing post message
        StringBuilder buffer = new StringBuilder();
        BufferedReader reader = request.getReader();
        String line;
        while ((line = reader.readLine()) != null) {
            buffer.append(line);
        }
        String data = buffer.toString();
        // parsing json
        JSONObject jsonObject = new JSONObject(data);
        // pulling name, id, and room
        String name = (String) jsonObject.get("name");
        String id = (String) jsonObject.get("id");
        String room = (String) jsonObject.get("room");

        DrawServer.rooms.get(room).addName(name, id); // add username

        // return successful response
        response.setContentType("text/plain");
        response.getWriter().write("Room " + "\"" + room + "\"" + " joined successfully.");

    }
}