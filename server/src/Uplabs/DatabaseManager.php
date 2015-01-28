<?php

namespace Uplabs;

use PDO;

class DatabaseManager
{
    /** @var PDO */
    public $pdo;

    /**
     * Description: Takes post data and inserts into experiment_data table
     *
     * @param $post - List of values which will make up one row in the database
     *
     * @return bool - true   -- if data was inserted --OR--
     *                false  -- if data could not be inserted
     */
    public function insert($post)
    {
        //Check if experiment already exists
        $experimentName = $post['experimentName'];
        $statement = "SELECT * FROM experiment WHERE experiment_name=" . $this->pdo->quote($experimentName);
        $sql = $this->pdo->prepare($statement);
        $sql->execute();

        if($sql->fetchAll() == []) {
            //Create a new Experiment
            $deviceNumber = $post['deviceNumber'];
            $ownerName = "";

            //Check if device has been specified
            $statement = "SELECT * FROM device WHERE device_number=" . $this->pdo->quote($deviceNumber);
            $sql = $this->pdo->prepare($statement);
            $sql->execute();

            if($sql->fetchAll() == []) {
                //Create a Device
                $deviceCaption = "Device Number: " . $deviceNumber;
                $deviceLocation = "";

                $deviceValues = [$deviceNumber,$deviceCaption,$ownerName,$deviceLocation];
                $this->addItem("device", $deviceValues);
            }

            $experimentValues = [$experimentName,$deviceNumber,$ownerName];

            $this->addItem("experiment",$experimentValues);
        }

        $result = $this->addItem("experiment_data", $post);

        return $result;
    }

    /**
     * Adds a user to the `user` table
     *
     * @param $post
     */
    public function addUser($post)
    {
        $userName = $post['username'];
        $password = $post['password'];

        $hash = password_hash($password,PASSWORD_BCRYPT);

        return $this->addItem('user', [$userName,$hash]);
    }

    /**
     * Retrieve all rows from experiment_data table
     *
     * @return array - All Experiment Data
     */
    public function retrieveAll()
    {
        $statement = "SELECT * FROM experiment_data";

        $sql = $this->pdo->prepare($statement);

        $sql->execute();

        return $sql->fetchAll();
    }

    /**
     * Retrieve all experiment data for a specific experiment
     *
     * @param string $experimentName
     * @return array - Experiment Data
     */
    public function retrieveExperimentData($experimentName)
    {
        $statement = "SELECT * FROM experiment_data WHERE experiment_name=" . $this->pdo->quote($experimentName);

        $sql = $this->pdo->prepare($statement);

        $sql->execute();

        return $sql->fetchAll();
    }

    public function retrieveExperimentNames()
    {
        $statement = "SELECT DISTINCT experiment_name FROM experiment_data";

        $sql = $this->pdo->prepare($statement);

        $sql->execute();

        return $sql->fetchAll();
    }

    /**
     * addItem()
     *
     * @param $table - Table to add to
     * @param $values - List of values associated with new item (i.e column values)
     *
     * @return bool - True if item was inserted
     *                False if not inserted
     */
    public function addItem($table, $values)
    {
        $statement = "INSERT INTO " . $table . " VALUES";

        $values = array_map([$this->pdo, "quote"], $values);

        $device = "(" . implode(', ', $values) . ")";

        $statement.=$device;

        $sql = $this->pdo->prepare($statement);

        $result = $sql->execute();

        return $result;
    }
}
 