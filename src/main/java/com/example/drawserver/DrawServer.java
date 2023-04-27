package com.example.drawchatserver;


import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.HashMap;


/**
 * This class represents a web socket server, a new connection is created, and it receives a roomID as a parameter
 * **/
@ServerEndpoint(value="/ws/{roomID}")
public class DrawServer {

    // map to contain all rooms <room code, object>
    public static HashMap<String, DrawRoom> rooms = new HashMap<String, DrawRoom>();


    @OnOpen
    public void open(@PathParam("roomID") String roomID, Session session) throws IOException, EncodeException {
        // emitting user id to user`
        JSONObject json = new JSONObject();
        json.put("event", "open");
        json.put("id", session.getId());
        session.getBasicRemote().sendText(json.toString());
        // adding room if it doesn't exist
        if (!rooms.containsKey(roomID)) {
            DrawRoom room = new DrawRoom(roomID);
            room.addId(session.getId());
            rooms.put(roomID, room);
        }
        else { // adding user if room already exists
            rooms.get(roomID).addId(session.getId());
        }

        System.out.println(session.getId() + " joined " + roomID);
    }

    @OnClose
    public void close(@PathParam("roomID") String roomID, Session session) throws IOException, EncodeException {
        String userId = session.getId();

        rooms.get(roomID).removeUser(userId); // removing user from room list
        if (rooms.get(roomID).isEmpty()) { // if room is now empty delete room
            rooms.remove(roomID);
        }
        else { // send updated list of users
            // constructing json array of usernames
            JSONArray names = new JSONArray();
            for (String name : rooms.get(roomID).getUsers()) {
                names.put(name);
            }
            // constructing json object to be sent
            JSONObject json = new JSONObject();
            json.put("event", "join");
            json.put("names", names);
            // sending names`
            for (Session s : session.getOpenSessions()) {
                if (s.isOpen() && rooms.get(roomID).contains(s.getId())) {
                    s.getBasicRemote().sendText(json.toString());
                }
            }
        }
        System.out.print(userId + " left room " + roomID);
    }

    @OnMessage
    public void handleMessage(String comm, Session session) throws IOException, EncodeException {
        String userId = session.getId();
        System.out.println("received message");
        // parse message
        JSONObject jsonmsg = new JSONObject(comm);
        String event = (String) jsonmsg.get("event");
        String room = (String) jsonmsg.get("room");
        // if join even then send updated names array to users in room
        if (event.equals("join")) {
            // constructing json array of usernames
            JSONArray names = new JSONArray();
            for (String name : rooms.get(room).getUsers()) {
                names.put(name);
            }
            // constructing json object to be sent
            JSONObject json = new JSONObject();
            json.put("event", "join");
            json.put("names", names);
            // sending names
            for (Session s : session.getOpenSessions()) {
                if (s.isOpen() && rooms.get(room).contains(s.getId())) {
                    s.getBasicRemote().sendText(json.toString());
                }
            }
        }
        else { // send drawing / erasing info back to all clients in same room
            for (Session s: session.getOpenSessions()) {
                if (s.isOpen() && rooms.get(room).contains(s.getId()) && !s.equals(session)) {
                    s.getBasicRemote().sendText(jsonmsg.toString());
                }
            }
        }




    }


}