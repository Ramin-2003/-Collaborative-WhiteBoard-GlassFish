package com.example.drawchatserver;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class DrawRoom {
    private String roomCode; // current room code of object
    // map of usernames and user id's
    private HashMap<String, String> users = new HashMap<>();

    DrawRoom(String roomCode) {
        this.roomCode = roomCode;
    }

    // add id / name
    public void addId(String id) {
        users.put(id, null);
    }
    public void addName(String name, String id) {
        users.replace(id, name);
    }
    // remove user from room
    public void removeUser(String id) {
        users.remove(id);
    }
    // check if room is empty
    public boolean isEmpty() {
        if (users.isEmpty()) {
            return true;
        }
        return false;
    }
    // check if user is in room
    public boolean contains(String id) {
        if (users.containsKey(id)) {
            return true;
        }
        return false;
    }
    // return full username list
    public List<String> getUsers() {
        List<String> names = new ArrayList<>();
        for (String val : users.values()) {
            names.add(val);
        }
        return names;
    }



}
